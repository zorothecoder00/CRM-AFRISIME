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
