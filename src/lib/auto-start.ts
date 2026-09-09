import { prisma } from "@/lib/prisma";
import { TaskStatus, ProjectStatus } from "@/generated/prisma/enums";
import { runProjectStatusChangedRules } from "@/lib/automation";

/**
 * Retour utilisateur — une tâche/un projet dont la date de début est
 * arrivée doit logiquement passer "En cours" tout seul, sans attendre une
 * action manuelle, sauf si son statut a déjà été changé explicitement
 * ailleurs (Bloquée/Annulée/Reportée pour une tâche, En pause/Annulé pour
 * un projet). D'où le filtre : on ne bascule QUE depuis le statut "pas
 * encore démarré" par défaut (A_FAIRE / PLANIFIE), jamais depuis un autre
 * statut — un utilisateur qui a explicitement mis en pause ou annulé garde
 * la main, le cron ne l'écrase jamais. Exécuté une fois par jour (cron
 * daily-checks) : la bascule intervient donc au plus tard le jour même où
 * la date de début arrive, pas à la seconde près.
 */
export async function autoStartDueTasksAndProjects(): Promise<{ tasksStarted: number; projectsStarted: number }> {
  const now = new Date();

  const dueTasks = await prisma.task.findMany({
    where: { statut: TaskStatus.A_FAIRE, dateDebut: { lte: now }, deletedAt: null },
    select: { id: true },
  });
  if (dueTasks.length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: dueTasks.map((t) => t.id) } },
      data: { statut: TaskStatus.EN_COURS },
    });
  }

  const dueProjects = await prisma.project.findMany({
    where: { statut: ProjectStatus.PLANIFIE, dateDebut: { lte: now }, deletedAt: null },
    select: { id: true, nom: true, responsableId: true },
  });
  if (dueProjects.length > 0) {
    await prisma.project.updateMany({
      where: { id: { in: dueProjects.map((p) => p.id) } },
      data: { statut: ProjectStatus.EN_COURS },
    });
    // Meme trigger d'automatisation qu'un changement de statut manuel
    // (updateProjectStatus) : un projet qui demarre automatiquement doit
    // declencher les memes regles configurees sur "statut de projet change".
    await Promise.all(
      dueProjects.map((p) =>
        runProjectStatusChangedRules({ id: p.id, nom: p.nom, responsableId: p.responsableId, statut: ProjectStatus.EN_COURS })
      )
    );
  }

  return { tasksStarted: dueTasks.length, projectsStarted: dueProjects.length };
}
