import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { collectDescendantEntityIds } from "@/lib/entity-tree";

/** Sous-ensemble de PrismaClient utilisé ici — accepte aussi bien `prisma`
 * qu'un `Prisma.TransactionClient` scopé (voir withTenantScopedSession),
 * pour que les pages migrées vers la Phase 2 (lectures) propagent leur
 * client scopé plutôt que de retomber silencieusement sur le client global
 * non scopé à l'intérieur de ce helper partagé. */
type ScopedClient = Pick<typeof prisma, "user" | "department" | "entity">;

export type EntityScope = {
  /** true = aucune restriction (ENTITY_VIEW_ALL, ou utilisateur/département pas encore rattaché à une entité). */
  canViewAll: boolean;
  /** Entité de l'utilisateur + tous ses descendants. Vide si canViewAll. */
  scopeEntityIds: string[];
};

type DeptLite = { id: string; parentId: string | null; entityId: string | null };

/**
 * Résout l'entité effective d'un département en remontant jusqu'à sa racine
 * (entityId n'est stocké que sur les départements racines, voir schema.prisma).
 */
function getDepartmentEntityId(departmentId: string, all: DeptLite[]): string | null {
  const byId = new Map(all.map((d) => [d.id, d]));
  let current = byId.get(departmentId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parentId);
  }
  return current?.entityId ?? null;
}

/**
 * Isolation réelle par entité (cahier des charges V2.2 §22, "isolation
 * réelle des données"). Repli permissif (canViewAll: true) plutôt que
 * restrictif dans les cas ambigus — ENTITY_VIEW_ALL, pas de département
 * assigné, département pas encore rattaché à une entité — pour ne jamais
 * verrouiller un compte par une donnée manquante plutôt qu'une décision
 * explicite de subdivision de l'organisation.
 */
export async function getUserEntityScope(
  userId: string,
  permissions: string[],
  client: ScopedClient = prisma
): Promise<EntityScope> {
  if (permissions.includes(PERMISSIONS.ENTITY_VIEW_ALL)) {
    return { canViewAll: true, scopeEntityIds: [] };
  }

  const user = await client.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
  if (!user?.departmentId) {
    return { canViewAll: true, scopeEntityIds: [] };
  }

  const allDepartments = await client.department.findMany({ select: { id: true, parentId: true, entityId: true } });
  const rootEntityId = getDepartmentEntityId(user.departmentId, allDepartments);
  if (!rootEntityId) {
    return { canViewAll: true, scopeEntityIds: [] };
  }

  const allEntities = await client.entity.findMany({ select: { id: true, nom: true, parentId: true } });
  return { canViewAll: false, scopeEntityIds: collectDescendantEntityIds(rootEntityId, allEntities) };
}

/**
 * Ids de département dans le périmètre d'une entité (pour filtrer
 * Projets/Tâches via `departmentId: { in: ... }`). Retourne `null` si
 * canViewAll (aucun filtre à appliquer).
 */
export async function getAllowedDepartmentIds(scope: EntityScope, client: ScopedClient = prisma): Promise<string[] | null> {
  if (scope.canViewAll) return null;
  const allDepartments = await client.department.findMany({ select: { id: true, parentId: true, entityId: true } });
  const scopeSet = new Set(scope.scopeEntityIds);
  return allDepartments
    .filter((d) => {
      const entityId = getDepartmentEntityId(d.id, allDepartments);
      return entityId !== null && scopeSet.has(entityId);
    })
    .map((d) => d.id);
}

/**
 * Filtre Prisma pour CrmOrganization. entityId absent (null) = organisation
 * pas encore rattachée à une entité, traitée comme visible par tous plutôt
 * que masquée — évite qu'une donnée nouvellement créée disparaisse
 * silencieusement faute de rattachement explicite.
 */
export function crmOrganizationScopeWhere(scope: EntityScope): Prisma.CrmOrganizationWhereInput | undefined {
  if (scope.canViewAll) return undefined;
  return { OR: [{ entityId: null }, { entityId: { in: scope.scopeEntityIds } }] };
}

/** Même principe que crmOrganizationScopeWhere, avec repli sur l'entité de l'organisation liée si le contact n'a pas la sienne propre. */
export function crmContactScopeWhere(scope: EntityScope): Prisma.CrmContactWhereInput | undefined {
  if (scope.canViewAll) return undefined;
  return {
    OR: [
      { entityId: { in: scope.scopeEntityIds } },
      { entityId: null, organizationId: null },
      { entityId: null, organization: { entityId: null } },
      { entityId: null, organization: { entityId: { in: scope.scopeEntityIds } } },
    ],
  };
}

/** Une opportunité hérite du périmètre de son contact, sinon de son organisation. */
export function crmOpportunityScopeWhere(scope: EntityScope): Prisma.CrmOpportunityWhereInput | undefined {
  if (scope.canViewAll) return undefined;
  return {
    OR: [
      { contactId: { not: null }, contact: { is: crmContactScopeWhere(scope) } },
      { contactId: null, organizationId: { not: null }, organization: { is: crmOrganizationScopeWhere(scope) } },
      { contactId: null, organizationId: null },
    ],
  };
}
