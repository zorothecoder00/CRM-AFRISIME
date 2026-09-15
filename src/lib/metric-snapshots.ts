import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";

const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"];

/**
 * Un seul point par (entite, metrique) et par jour — evite d'empiler des
 * doublons si le cron est relance le meme jour (contrairement a
 * AutomationExecution, la contrainte @@unique du modele porte sur le
 * timestamp exact et ne suffit pas a elle seule pour ce dedoublonnage
 * "jour civil").
 */
async function upsertDailySnapshot(entityType: string, entityId: string, metric: string, valeur: number) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.metricSnapshot.findFirst({
    where: { entityType, entityId, metric, capturedAt: { gte: startOfDay } },
  });
  if (existing) {
    await prisma.metricSnapshot.update({ where: { id: existing.id }, data: { valeur } });
  } else {
    await prisma.metricSnapshot.create({ data: { entityType, entityId, metric, valeur } });
  }
}

/**
 * Capture quotidienne (V2.2 §11) — appelee depuis le cron, juste avant les
 * agents IA pour qu'ils puissent s'appuyer sur des snapshots a jour le meme
 * jour. Alimente src/lib/predictive-scoring.ts (tendances). Perimetre
 * volontairement restreint aux entites actives : suivre des entites closes
 * n'apporterait aucune tendance utile et gonflerait la table sans raison.
 *
 * Snapshots par categorie parallelises (Promise.all) : chaque upsert cible
 * une ligne distincte (entityId different), donc sans risque de collision
 * entre appels concurrents -- meme raisonnement que la parallelisation des
 * boucles cron dans automation.ts/ai-agents.ts (perf 2026-09-14).
 */
export async function captureDailySnapshots() {
  const [projects, objectives, activeUsers, tasks, leaves, opportunities] = await Promise.all([
    prisma.project.findMany({
      where: { statut: "EN_COURS" },
      select: { id: true, avancement: true, budget: true, coutReel: true },
    }),
    prisma.objective.findMany({
      where: { statut: "EN_COURS" },
      include: { indicators: { select: { valeurCible: true, valeurActuelle: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
    }),
    prisma.task.findMany({ include: { assignees: { select: { userId: true } } } }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.crmOpportunity.findMany({
      where: { statut: { notIn: ["GAGNEE", "PERDUE"] } },
      select: { id: true, probabilite: true },
    }),
  ]);

  await Promise.all(
    projects.map(async (p) => {
      await upsertDailySnapshot("Project", p.id, "avancement", p.avancement);
      if (p.budget !== null && Number(p.budget) > 0) {
        await upsertDailySnapshot("Project", p.id, "budgetRatio", (p.coutReel ? Number(p.coutReel) : 0) / Number(p.budget));
      }
    })
  );

  await Promise.all(
    objectives.map((o) => {
      const cible = o.indicators.reduce((s, i) => s + Number(i.valeurCible), 0);
      const actuel = o.indicators.reduce((s, i) => s + Number(i.valeurActuelle), 0);
      return cible > 0 ? upsertDailySnapshot("Objective", o.id, "indicatorProgress", actuel / cible) : undefined;
    })
  );

  const workload = computeWorkload(
    activeUsers.map((u) => ({
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
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );
  await Promise.all(workload.map((w) => upsertDailySnapshot("User", w.userId, "tauxOccupation", w.tauxOccupation)));

  await Promise.all(
    opportunities
      .filter((o) => o.probabilite !== null)
      .map((o) => upsertDailySnapshot("CrmOpportunity", o.id, "probabilite", o.probabilite!))
  );
}

export { ACTIVE_TASK_STATUSES };
