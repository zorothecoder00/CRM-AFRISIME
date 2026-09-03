import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";
import { computeSkillsIntelligence, type SkillGap } from "@/lib/skills-intelligence";

// Workforce Planning 3.0 (cahier des charges V3.0 §22) — va au-delà du
// simple workload (src/lib/workload.ts, charge instantanée) : besoins
// futurs, compétences critiques (délégué à skills-intelligence.ts, §23,
// pour ne pas dupliquer la comparaison disponible/nécessaire/future),
// postes à créer, capacités disponibles, projections, et pistes de
// formation/recrutement dérivées des écarts de compétences.

const MOIS_PROJECTION = 12;

export type PosteVacant = { id: string; nom: string; departement: string | null; critique: boolean };

export type EffectifSite = { site: string; count: number };

export type WorkforcePlan = {
  effectifActuel: number;
  effectifIlYA12Mois: number;
  projectionEffectif12Mois: number;
  capaciteDisponibleHeures: number;
  chargeGlobaleHeures: number;
  tauxOccupationGlobal: number;
  postesVacants: PosteVacant[];
  postesCritiquesVacants: PosteVacant[];
  competencesCritiques: SkillGap[];
  besoinsRecrutement: SkillGap[];
  besoinsFormation: SkillGap[];
  // Ventilation de l'effectif actuel par site (User.siteId) — permet de voir
  // où sont concentrés les effectifs, distinct de la ventilation par
  // département déjà portée par postesVacants.
  effectifParSite: EffectifSite[];
};

export async function computeWorkforcePlan(): Promise<WorkforcePlan> {
  const now = new Date();
  const il12Mois = new Date(now);
  il12Mois.setMonth(il12Mois.getMonth() - MOIS_PROJECTION);

  const [users, tasks, leaves, postes, effectifIlYA12Mois, skillGaps] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        capaciteHebdomadaireHeures: true,
        role: { select: { label: true } },
        site: { select: { nom: true } },
      },
    }),
    prisma.task.findMany({
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
    prisma.poste.findMany({
      select: { id: true, nom: true, critique: true, department: { select: { name: true } }, users: { select: { id: true } } },
    }),
    prisma.user.count({ where: { isActive: true, createdAt: { lte: il12Mois } } }),
    computeSkillsIntelligence(),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves,
    now
  );

  const capaciteDisponibleHeures = Math.round(workload.reduce((s, w) => s + w.disponibiliteHeures, 0) * 10) / 10;
  const chargeGlobaleHeures = Math.round(workload.reduce((s, w) => s + w.chargeHeures, 0) * 10) / 10;
  const capaciteTotale = workload.reduce((s, w) => s + w.capaciteHeures, 0);
  const tauxOccupationGlobal = capaciteTotale > 0 ? Math.round((chargeGlobaleHeures / capaciteTotale) * 100) : 0;

  const effectifActuel = users.length;
  const croissance = effectifActuel - effectifIlYA12Mois;
  const projectionEffectif12Mois = Math.max(0, effectifActuel + croissance);

  const postesVacants: PosteVacant[] = postes
    .filter((p) => p.users.length === 0)
    .map((p) => ({ id: p.id, nom: p.nom, departement: p.department?.name ?? null, critique: p.critique }));

  const effectifParSiteMap = new Map<string, number>();
  for (const u of users) {
    const site = u.site?.nom ?? "Non renseigné";
    effectifParSiteMap.set(site, (effectifParSiteMap.get(site) ?? 0) + 1);
  }
  const effectifParSite: EffectifSite[] = [...effectifParSiteMap.entries()]
    .map(([site, count]) => ({ site, count }))
    .sort((a, b) => b.count - a.count);

  return {
    effectifActuel,
    effectifIlYA12Mois,
    projectionEffectif12Mois,
    capaciteDisponibleHeures,
    chargeGlobaleHeures,
    tauxOccupationGlobal,
    postesVacants,
    postesCritiquesVacants: postesVacants.filter((p) => p.critique),
    competencesCritiques: skillGaps.filter((g) => g.ecart > 0),
    besoinsRecrutement: skillGaps.filter((g) => g.recommandation === "RECRUTEMENT"),
    besoinsFormation: skillGaps.filter((g) => g.recommandation === "FORMATION"),
    effectifParSite,
  };
}
