import { prisma } from "@/lib/prisma";
import { recordInsight } from "@/lib/ai-agents";
import { computeCriticalPath } from "@/lib/critical-path";

const ACTIVE_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"];

/**
 * Project Studio §66 (Automatisations entre modules) — "Retard d'une tâche
 * → le système vérifie activité/Output/jalon/chemin critique/budget/risque,
 * puis alerte." Tourne quotidiennement (cron, voir daily-checks) plutôt
 * qu'à la visite de page — un retard est un état qui s'installe dans le
 * temps, pas un événement instantané. N'alerte que si le retard a un impact
 * identifiable (chemin critique, Output lié, ou jalon à venir) : une tâche
 * isolée en retard sans consequence ne mérite pas une alerte, sous peine de
 * lasser l'utilisateur.
 */
export async function runTaskDelayImpactChecks() {
  const overdueTasks = await prisma.task.findMany({
    where: { statut: { in: ACTIVE_STATUSES as never }, echeance: { not: null, lt: new Date() }, deletedAt: null },
    select: { id: true, titre: true, projectId: true, echeance: true, sectionId: true, responsablePrincipalId: true },
  });
  if (overdueTasks.length === 0) return;

  const projectIds = [...new Set(overdueTasks.map((t) => t.projectId))];

  for (const projectId of projectIds) {
    const tasksInProject = overdueTasks.filter((t) => t.projectId === projectId);

    const [allTasks, dependencies, sections, milestones, risks, project] = await Promise.all([
      prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, titre: true, dateDebut: true, echeance: true, tempsEstimeHeures: true },
      }).then((rows) =>
        rows.map((t) => ({ ...t, tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null }))
      ),
      prisma.taskDependency.findMany({
        where: { task: { projectId } },
        select: { taskId: true, dependsOnTaskId: true, type: true },
      }),
      prisma.projectSection.findMany({
        where: { projectId },
        select: { id: true, nom: true, theoryOfChangeNode: { select: { niveau: true, titre: true } } },
      }),
      prisma.projectMilestone.findMany({
        where: { projectId, dateCible: { gte: new Date() } },
        orderBy: { dateCible: "desc" },
        take: 1,
      }),
      prisma.projectRisk.findMany({
        where: { projectId, statut: { notIn: ["MAITRISE", "CLOS"] } },
        select: { id: true },
      }),
      prisma.project.findUnique({ where: { id: projectId }, select: { budget: true, coutReel: true, responsableId: true } }),
    ]);

    const criticalPath = computeCriticalPath(allTasks, dependencies);
    const criticalTaskIds = new Set(
      criticalPath ? criticalPath.tasks.filter((t) => t.critique).map((t) => t.id) : []
    );
    const finalMilestone = milestones[0] ?? null;
    const budgetDepasse =
      project?.budget !== null && project?.coutReel !== null && project !== null && Number(project.coutReel) > Number(project.budget);

    for (const task of tasksInProject) {
      const retardJours = task.echeance ? Math.floor((Date.now() - task.echeance.getTime()) / (24 * 60 * 60 * 1000)) : 0;
      const surCheminCritique = criticalTaskIds.has(task.id);
      const section = task.sectionId ? sections.find((s) => s.id === task.sectionId) : null;
      const outputConcerne = section?.theoryOfChangeNode?.niveau === "OUTPUT" ? section.theoryOfChangeNode.titre : null;

      if (!surCheminCritique && !outputConcerne && !finalMilestone) continue;

      const parts: string[] = [`⚠️ La tâche "${task.titre}" a ${retardJours} jour(s) de retard.`];
      if (surCheminCritique) parts.push("Elle est sur le chemin critique du projet.");
      if (outputConcerne) parts.push(`Ce retard peut affecter l'Output "${outputConcerne}".`);
      if (finalMilestone) parts.push(`Il pourrait repousser le jalon "${finalMilestone.nom}" (prévu le ${finalMilestone.dateCible.toLocaleDateString("fr-FR")}).`);
      if (budgetDepasse) parts.push("Le budget du projet est déjà dépassé — ce retard aggrave le risque financier.");
      if (risks.length > 0) parts.push(`${risks.length} risque(s) actif(s) sur ce projet.`);

      await recordInsight({
        agent: "PROJECT_MANAGER",
        type: "ALERTE",
        titre: `Retard à impact — ${task.titre}`,
        contenu: parts.join(" "),
        entityType: "Task",
        entityId: task.id,
        notifyUserId: task.responsablePrincipalId ?? project?.responsableId,
      });
    }
  }
}
