import { prisma } from "@/lib/prisma";
import { computeScopePilotage, type ScopePilotage } from "@/lib/pilotage-levels";
import { collectDescendantIds } from "@/lib/department-tree";
import { collectDescendantEntityIds } from "@/lib/entity-tree";
import { getOrganizationDevise } from "@/lib/currency";
import { convertMontant } from "@/lib/exchange-rates";

/** Départements dans le périmètre d'une entité (elle-même + ses sous-entités), avec l'entité de chaque département pour la conversion de devise. */
async function resolveEntityScopeDepartmentIds(entityId: string) {
  const allEntities = await prisma.entity.findMany({ select: { id: true, nom: true, parentId: true, devise: true } });
  const scopeEntityIds = new Set(collectDescendantEntityIds(entityId, allEntities));

  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true, entityId: true },
  });
  const rootDepartmentIds = allDepartments.filter((d) => d.entityId && scopeEntityIds.has(d.entityId)).map((d) => d.id);

  const departmentIds = new Set<string>();
  for (const rootId of rootDepartmentIds) {
    for (const id of collectDescendantIds(rootId, allDepartments)) departmentIds.add(id);
  }

  return { departmentIds, allDepartments, allEntities };
}

/**
 * Rollup Groupe/Pays/Société/Filiale/Agence (cahier des charges V2.2 §24) —
 * réutilise computeScopePilotage (module 10/§XXIII), déjà éprouvé pour les
 * niveaux Direction/Département/Service/Équipe, plutôt que de recalculer les
 * indicateurs différemment à ce niveau supérieur. budgetTotal/coutReelTotal
 * sont ensuite remplacés par computeEntityBudgetRollup ci-dessous, qui
 * convertit chaque projet vers une devise de référence commune avant de
 * sommer (une entité peut englober des sous-entités en devises
 * différentes — sommer des montants bruts sans convertir serait trompeur).
 */
export async function computeEntityScopePilotage(entityId: string): Promise<ScopePilotage> {
  const { departmentIds } = await resolveEntityScopeDepartmentIds(entityId);

  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { departmentId: { in: Array.from(departmentIds) }, isActive: true },
      select: { id: true },
    }),
    prisma.project.findMany({
      where: { departmentId: { in: Array.from(departmentIds) } },
      select: { id: true },
    }),
  ]);

  return computeScopePilotage({ userIds: users.map((u) => u.id), projectIds: projects.map((p) => p.id) });
}

export type EntityBudgetRollup = {
  budgetTotal: number;
  coutReelTotal: number;
  devise: string;
  /** true si au moins un projet était dans une devise sans taux de change configuré vers `devise` — le total est alors une sous-estimation (montant brut non converti additionné tel quel). */
  conversionIncomplete: boolean;
};

/**
 * Budget/coût réel consolidés d'une entité, convertis vers la devise de
 * l'entité consultée (repli sur la devise de l'organisation) via
 * src/lib/exchange-rates.ts — voir le commentaire sur ExchangeRate dans
 * schema.prisma. Un projet est rattaché à la devise de l'entité de son
 * département (pas de champ devise direct sur Project : les organisations
 * multi-pays n'ont typiquement pas de compta multi-devise par projet, la
 * devise se déduit de la localisation du département).
 */
export async function computeEntityBudgetRollup(entityId: string): Promise<EntityBudgetRollup> {
  const { departmentIds, allDepartments, allEntities } = await resolveEntityScopeDepartmentIds(entityId);
  const entityById = new Map(allEntities.map((e) => [e.id, e]));
  const departmentEntityId = new Map(allDepartments.map((d) => [d.id, d.entityId]));

  const [viewedEntity, orgDevise, projects] = await Promise.all([
    prisma.entity.findUnique({ where: { id: entityId }, select: { devise: true } }),
    getOrganizationDevise(),
    prisma.project.findMany({
      where: { departmentId: { in: Array.from(departmentIds) } },
      select: { departmentId: true, budget: true, coutReel: true },
    }),
  ]);
  const referenceDevise = viewedEntity?.devise || orgDevise;

  let budgetTotal = 0;
  let coutReelTotal = 0;
  let conversionIncomplete = false;

  for (const p of projects) {
    const projectEntityId = departmentEntityId.get(p.departmentId);
    const projectDevise = (projectEntityId ? entityById.get(projectEntityId)?.devise : null) || orgDevise;

    if (p.budget !== null) {
      const { value, converted } = await convertMontant(Number(p.budget), projectDevise, referenceDevise);
      budgetTotal += value;
      if (!converted && projectDevise !== referenceDevise) conversionIncomplete = true;
    }
    if (p.coutReel !== null) {
      const { value, converted } = await convertMontant(Number(p.coutReel), projectDevise, referenceDevise);
      coutReelTotal += value;
      if (!converted && projectDevise !== referenceDevise) conversionIncomplete = true;
    }
  }

  return { budgetTotal, coutReelTotal, devise: referenceDevise, conversionIncomplete };
}

export type EntityWithCounts = {
  id: string;
  nom: string;
  code: string;
  parentId: string | null;
  pays: string | null;
  childCount: number;
  rootDepartmentIds: string[];
};

/** Départements racines rattachés directement à une entité (sans descendre dans les entités enfants). */
export async function getRootDepartmentsForEntity(entityId: string) {
  return prisma.department.findMany({
    where: { entityId },
    include: { _count: { select: { users: true, projects: true } } },
    orderBy: { name: "asc" },
  });
}
