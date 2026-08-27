import { prisma } from "@/lib/prisma";
import { runProjectCompletedRules } from "@/lib/automation";

/**
 * Recalcule Project.avancement à partir du % de tâches terminées (le champ
 * était jusqu'ici figé à sa valeur de création, jamais mis à jour). Déclenche
 * les règles PROJECT_COMPLETED quand le projet vient d'atteindre 100 %.
 */
export async function recomputeProjectProgress(projectId: string) {
  const [project, totalTasks, completedTasks] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, statut: "TERMINEE" } }),
  ]);

  const avancement = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const justCompleted = project.avancement < 100 && avancement === 100;

  await prisma.project.update({ where: { id: projectId }, data: { avancement } });

  if (justCompleted) {
    await runProjectCompletedRules({
      id: project.id,
      nom: project.nom,
      responsableId: project.responsableId,
    });
  }

  return avancement;
}

/**
 * Recalcule une tâche mère à partir de ses sous-tâches : Task.avancement
 * n'était jusqu'ici qu'un simple 0/100 pilotée par le statut de la tâche
 * elle-même, sans lien avec ses sous-tâches — une tâche mère avec toutes ses
 * sous-tâches "Terminée" restait "À faire" à 0 %. Appelée à chaque mutation
 * d'une sous-tâche (statut changé, ajoutée, supprimée/restaurée).
 *
 * Ne touche jamais une tâche mère ANNULEE. Fait avancer le statut vers
 * TERMINEE quand toutes les sous-tâches le sont, et le fait reculer vers
 * EN_COURS si la tâche mère était TERMINEE mais qu'une sous-tâche ne l'est
 * plus (nouvelle sous-tâche ajoutée, ou sous-tâche rouverte) — sans quoi une
 * tâche affichée "Terminée" à 100 % pourrait contenir une sous-tâche encore
 * "À faire", ce qui serait plus déroutant qu'une réouverture automatique.
 * Ne modifie en revanche jamais un statut manuel intermédiaire (Bloquée, En
 * révision...) tant que les sous-tâches ne sont pas toutes terminées.
 */
export async function recomputeParentTaskFromSubtasks(parentTaskId: string) {
  const [parent, subtasks] = await Promise.all([
    prisma.task.findUnique({ where: { id: parentTaskId }, select: { statut: true } }),
    prisma.task.findMany({
      where: { parentTaskId, deletedAt: null },
      select: { statut: true, avancement: true },
    }),
  ]);

  if (!parent || parent.statut === "ANNULEE" || subtasks.length === 0) return;

  const avancement = Math.round(subtasks.reduce((sum, s) => sum + s.avancement, 0) / subtasks.length);
  const allDone = subtasks.every((s) => s.statut === "TERMINEE");

  let statut = parent.statut;
  let completedAt: Date | null | undefined;
  if (allDone && parent.statut !== "TERMINEE") {
    statut = "TERMINEE";
    completedAt = new Date();
  } else if (!allDone && parent.statut === "TERMINEE") {
    statut = "EN_COURS";
    completedAt = null;
  }

  await prisma.task.update({
    where: { id: parentTaskId },
    data: { avancement, statut, ...(completedAt !== undefined ? { completedAt } : {}) },
  });
}
