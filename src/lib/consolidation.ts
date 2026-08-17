import { prisma } from "@/lib/prisma";
import { computeScopePilotage, type ScopePilotage } from "@/lib/pilotage-levels";
import { collectDescendantIds } from "@/lib/department-tree";
import { collectDescendantEntityIds } from "@/lib/entity-tree";

/**
 * Rollup Groupe/Pays/Société/Filiale/Agence (cahier des charges V2.2 §24) —
 * réutilise computeScopePilotage (module 10/§XXIII), déjà éprouvé pour les
 * niveaux Direction/Département/Service/Équipe, plutôt que de recalculer les
 * indicateurs différemment à ce niveau supérieur.
 */
export async function computeEntityScopePilotage(entityId: string): Promise<ScopePilotage> {
  const allEntities = await prisma.entity.findMany({ select: { id: true, nom: true, parentId: true } });
  const scopeEntityIds = new Set(collectDescendantEntityIds(entityId, allEntities));

  const allDepartments = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true, entityId: true },
  });
  const rootDepartmentIds = allDepartments.filter((d) => d.entityId && scopeEntityIds.has(d.entityId)).map((d) => d.id);

  const departmentIds = new Set<string>();
  for (const rootId of rootDepartmentIds) {
    for (const id of collectDescendantIds(rootId, allDepartments)) departmentIds.add(id);
  }

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
