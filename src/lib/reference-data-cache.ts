import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Analyse perf/charge (2026-09-14) — données de référence (structure
 * organisationnelle, jours fériés) relues intégralement depuis zéro à
 * CHAQUE appel de getUserEntityScope/getAllowedDepartmentIds/
 * getEntityHolidays (entity-scope.ts, personal-planning-holidays.ts),
 * elles-mêmes appelées sur quasiment chaque navigation de l'app (filtrage
 * par périmètre d'entité). Ces données changent rarement (réorganisation,
 * configuration des jours fériés) — mise en cache 5 min, invalidée
 * explicitement dès qu'un département/une entité/un jour férié est modifié
 * (voir department.actions.ts, entity.actions.ts) plutôt que d'attendre la
 * fenêtre de péremption.
 *
 * Même limite que les caches existants (health-score.ts,
 * maturity-assessment.ts) : pas de clé par organisation — cohérent avec le
 * reste de l'app, dont la Phase 2 multi-tenant (RLS appliquée aux lectures)
 * n'est câblée nulle part encore (voir schema.prisma, note Multi-tenant).
 * Le jour où un appelant passera un client Prisma scopé tenant à
 * getUserEntityScope, il doit contourner ce cache (voir entity-scope.ts) —
 * ces exports ne sont donc à utiliser que sur le client global non scopé.
 */

const DEPARTMENTS_TAG = "ref-departments";
const ENTITIES_TAG = "ref-entities";
const HOLIDAYS_TAG = "ref-holidays";

export type DeptLite = { id: string; parentId: string | null; entityId: string | null };
export type EntityLite = { id: string; nom: string; parentId: string | null };
export type HolidayLite = { nom: string; date: Date; recurrenceAnnuelle: boolean };

export const getAllDepartmentsLite = unstable_cache(
  async (): Promise<DeptLite[]> => prisma.department.findMany({ select: { id: true, parentId: true, entityId: true } }),
  ["ref-departments-lite"],
  { tags: [DEPARTMENTS_TAG], revalidate: 300 }
);

export const getAllEntitiesLite = unstable_cache(
  async (): Promise<EntityLite[]> => prisma.entity.findMany({ select: { id: true, nom: true, parentId: true } }),
  ["ref-entities-lite"],
  { tags: [ENTITIES_TAG], revalidate: 300 }
);

export const getHolidaysForEntity = unstable_cache(
  async (entityId: string): Promise<HolidayLite[]> =>
    prisma.holiday.findMany({ where: { entityId }, select: { nom: true, date: true, recurrenceAnnuelle: true } }),
  ["ref-holidays-for-entity"],
  { tags: [HOLIDAYS_TAG], revalidate: 300 }
);

// updateTag (pas revalidateTag) — Next.js 16 : n'utilisable que depuis un
// Server Action (c'est le cas de tous les appelants, voir department.actions.ts/
// entity.actions.ts), invalide IMMÉDIATEMENT (read-your-own-writes) plutôt
// que stale-while-revalidate — c'est ce qu'on veut ici : l'admin qui vient
// de modifier un département/une entité doit voir l'effet tout de suite.
export function invalidateDepartmentsCache(): void {
  updateTag(DEPARTMENTS_TAG);
}

export function invalidateEntitiesCache(): void {
  updateTag(ENTITIES_TAG);
}

export function invalidateHolidaysCache(): void {
  updateTag(HOLIDAYS_TAG);
}
