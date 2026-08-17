import { prisma } from "@/lib/prisma";
import { computeWorkload } from "@/lib/workload";

const NIVEAU_SCORE: Record<string, number> = {
  DEBUTANT: 25,
  INTERMEDIAIRE: 50,
  AVANCE: 75,
  EXPERT: 100,
};

export type CandidateScore = {
  userId: string;
  name: string;
  roleLabel: string;
  scoreTotal: number;
  competence: number;
  disponibilite: number;
  charge: number;
  experience: number;
  projet: number;
  tauxOccupation: number;
  enConge: boolean;
};

/**
 * Suggère les personnes les plus adaptées pour une tâche (V2.2 §9.2) :
 * compétence + disponibilité + charge + expérience + projet, chacun
 * ramené à un score 0-100 puis pondéré. Transparent (score détaillé par
 * critère renvoyé), pas une boîte noire. Réutilise computeWorkload
 * (src/lib/workload.ts, déjà utilisé par la charge de travail/le pilotage)
 * pour la charge, plutôt que de recalculer la même chose différemment.
 */
const URGENT_PRIORITIES = new Set(["TRES_HAUTE", "HAUTE"]);

export async function suggestAssignees(params: {
  projectId: string;
  competenceIds?: string[];
  echeance?: Date;
  /** V2.2 §9.1 "priorités" — une tâche urgente pèse plus sur charge/disponibilité que sur l'expérience. */
  priorite?: string;
  limit?: number;
}): Promise<CandidateScore[]> {
  const { projectId, competenceIds = [], echeance, priorite, limit = 5 } = params;
  const urgent = priorite ? URGENT_PRIORITIES.has(priorite) : false;

  const [users, tasks, leaves, projectMembers, evaluations] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true, competences: true },
    }),
    prisma.task.findMany({
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
    prisma.evaluation.findMany({
      where: { scoreGlobal: { not: null }, statut: { not: "BROUILLON" } },
      select: { evalueId: true, scoreGlobal: true },
    }),
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
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );
  const workloadByUser = new Map(workload.map((w) => [w.userId, w]));

  const memberIds = new Set(projectMembers.map((m) => m.userId));

  const completedCountByUser = new Map<string, number>();
  for (const t of tasks) {
    if (t.statut !== "TERMINEE") continue;
    for (const id of new Set([t.responsablePrincipalId, ...t.assignees.map((a) => a.userId)])) {
      completedCountByUser.set(id, (completedCountByUser.get(id) ?? 0) + 1);
    }
  }
  const maxCompleted = Math.max(1, ...completedCountByUser.values());

  const evalSums = new Map<string, { sum: number; count: number }>();
  for (const e of evaluations) {
    if (e.scoreGlobal === null) continue;
    const cur = evalSums.get(e.evalueId) ?? { sum: 0, count: 0 };
    cur.sum += Number(e.scoreGlobal);
    cur.count += 1;
    evalSums.set(e.evalueId, cur);
  }

  const onLeaveDuring = new Set(
    echeance ? leaves.filter((l) => l.dateDebut <= echeance && l.dateFin >= echeance).map((l) => l.userId) : []
  );

  const candidates: CandidateScore[] = users.map((u) => {
    let competence = 50; // neutre si aucune compétence requise
    if (competenceIds.length > 0) {
      const matches = u.competences.filter((uc) => competenceIds.includes(uc.competenceId));
      competence =
        matches.length === 0
          ? 0
          : Math.round(matches.reduce((s, m) => s + (NIVEAU_SCORE[m.niveau] ?? 50), 0) / competenceIds.length);
    }

    const w = workloadByUser.get(u.id);
    const tauxOccupation = w?.tauxOccupation ?? 0;
    const charge = Math.max(0, 100 - tauxOccupation);

    const enConge = onLeaveDuring.has(u.id);
    const disponibilite = enConge ? 0 : w?.enCongeAujourdhui ? 50 : 100;

    const completed = completedCountByUser.get(u.id) ?? 0;
    const evalStat = evalSums.get(u.id);
    const evalScore = evalStat ? (evalStat.sum / evalStat.count / 5) * 100 : 50;
    const experience = Math.round((completed / maxCompleted) * 60 + evalScore * 0.4);

    const projet = memberIds.has(u.id) ? 100 : 0;

    // Priorité urgente : la disponibilité immédiate et la marge de charge
    // comptent davantage que l'expérience passée — reste 1.0 au total.
    const weights = urgent
      ? { competence: 0.25, disponibilite: 0.3, charge: 0.3, experience: 0.05, projet: 0.1 }
      : { competence: 0.3, disponibilite: 0.2, charge: 0.25, experience: 0.15, projet: 0.1 };

    const scoreTotal = Math.round(
      competence * weights.competence +
        disponibilite * weights.disponibilite +
        charge * weights.charge +
        experience * weights.experience +
        projet * weights.projet
    );

    return {
      userId: u.id,
      name: u.name,
      roleLabel: u.role.label,
      scoreTotal,
      competence,
      disponibilite,
      charge,
      experience,
      projet,
      tauxOccupation,
      enConge,
    };
  });

  return candidates.sort((a, b) => b.scoreTotal - a.scoreTotal).slice(0, limit);
}
