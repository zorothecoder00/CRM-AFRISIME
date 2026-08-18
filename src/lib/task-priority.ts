import { prisma } from "@/lib/prisma";

const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"] as const;

const PRIORITY_SCORE: Record<string, number> = { BASSE: 20, MOYENNE: 45, HAUTE: 75, TRES_HAUTE: 100 };
const PROJECT_PRIORITY_SCORE: Record<string, number> = { BASSE: 20, MOYENNE: 45, HAUTE: 75, CRITIQUE: 100 };

/**
 * Moteur de priorisation IA (cahier des charges V2.2 §40) — "IA" au sens
 * scoring pondéré déterministe, pas un modèle génératif (aucune clé LLM,
 * même contrainte que le reste du §26-39 ; contrairement à ces autres
 * modules cependant, un scoring pondéré n'a jamais nécessité de LLM, donc
 * rien n'est différé ici). Combine les 6 facteurs cités par le cahier :
 * Urgence (proximité de l'échéance), Importance (priorité de la tâche),
 * Impact (priorité/criticité du projet), Échéance (retard réel, distinct de
 * la proximité — un retard pèse plus qu'une échéance simplement proche),
 * Dépendances (nombre de tâches bloquées par celle-ci — plus il y en a, plus
 * la débloquer est prioritaire), Risque (le projet porte-t-il un risque actif
 * à fort impact/probabilité). Pondération documentée ci-dessous, pas
 * calibrée sur des données réelles — c'est une heuristique explicite, pas un
 * modèle appris.
 */
export type TaskPriorityScore = {
  taskId: string;
  titre: string;
  projectId: string;
  projectNom: string;
  score: number;
  href: string;
};

export async function computeTop5Actions(userId: string): Promise<TaskPriorityScore[]> {
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      statut: { in: ACTIVE_TASK_STATUSES as unknown as never },
      OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
    },
    include: {
      project: {
        select: {
          nom: true,
          priorite: true,
          risks: { where: { impact: "ELEVE", probabilite: "ELEVEE", statut: { notIn: ["MAITRISE", "CLOS"] } }, select: { id: true } },
        },
      },
      blocking: { select: { id: true } },
    },
  });

  const scored = tasks.map((t) => {
    // Urgence : 100 si en retard, decroit lineairement jusqu'a 0 a 14 jours
    // ou plus, 50 si pas d'echeance (ni urgent ni non-urgent par defaut).
    let urgence = 50;
    if (t.echeance) {
      const joursRestants = (t.echeance.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      urgence = joursRestants < 0 ? 100 : Math.max(0, 100 - (joursRestants / 14) * 100);
    }
    const importance = PRIORITY_SCORE[t.priorite] ?? 45;
    const impact = PROJECT_PRIORITY_SCORE[t.project.priorite] ?? 45;
    // Echeance (distinct d'Urgence) : penalite fixe si reellement en retard,
    // pas juste proche — evite de confondre "demain" et "il y a 2 semaines".
    const echeancePenalty = t.echeance && t.echeance.getTime() < now.getTime() ? 100 : 0;
    const dependances = Math.min(100, t.blocking.length * 25);
    const risque = t.project.risks.length > 0 ? 100 : 0;

    const score =
      urgence * 0.25 + importance * 0.2 + impact * 0.2 + echeancePenalty * 0.15 + dependances * 0.1 + risque * 0.1;

    return {
      taskId: t.id,
      titre: t.titre,
      projectId: t.projectId,
      projectNom: t.project.nom,
      score: Math.round(score),
      href: `/taches/${t.id}`,
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
