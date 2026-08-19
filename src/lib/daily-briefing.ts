import { prisma } from "@/lib/prisma";

const OPPORTUNITY_STALE_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"] as const;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export type DailyBriefing = {
  tachesPrioritaires: number;
  reunions: number;
  projetsARisque: number;
  validationsEnAttente: number;
  opportunitesARelancer: number;
  decisionsATraiter: number;
  messagesNonLus: number;
  prioriteRecommandee: { label: string; href: string } | null;
};

/**
 * Briefing quotidien (cahier des charges V2.2 §30, aligné V3.0 §50
 * "Votre journée" — même principe : priorités/réunions/validation/risque/
 * décision, complété ici par les messages non lus, seul élément de la
 * liste du cahier qui manquait) — agrege des comptes deja calcules
 * ailleurs sous forme de Notification (voir daily-checks cron) mais
 * consolides ici en un seul objet par utilisateur, calcule a la demande
 * (pas de nouveau modele de persistance : comme la plupart des widgets
 * dashboard, recalcule a chaque affichage). "Priorite recommandee" = le
 * premier element trouve en parcourant les categories par ordre d'urgence
 * (tache prioritaire > projet a risque > decision > validation).
 */
export async function generateDailyBriefing(userId: string): Promise<DailyBriefing> {
  const now = new Date();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: { select: { key: true } } } });

  const [
    priorityTasks,
    meetingsToday,
    projectsOwned,
    memberProjectIds,
    blockedTaskRuns,
    blockedAdminRuns,
    staleOpportunities,
    meetingDecisions,
    governanceDecisions,
    conversationsForUnread,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        statut: { in: ACTIVE_TASK_STATUSES as unknown as never },
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        AND: [{ OR: [{ priorite: { in: ["TRES_HAUTE", "HAUTE"] } }, { echeance: { lt: now } }] }],
      },
      select: { id: true, titre: true },
      take: 20,
    }),
    prisma.meetingParticipant.count({
      where: { userId, meeting: { dateHeure: { gte: startOfDay(now), lte: endOfDay(now) } } },
    }),
    prisma.project.findMany({
      where: { responsableId: userId, statut: "EN_COURS" },
      select: { id: true, nom: true, dateFin: true, risks: { where: { impact: "ELEVE", probabilite: "ELEVEE", statut: { notIn: ["MAITRISE", "CLOS"] } }, select: { id: true } } },
    }),
    prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    prisma.taskValidationRun.findMany({
      where: { statut: "EN_COURS" },
      include: { workflow: { include: { steps: true } }, task: { select: { titre: true, id: true } } },
    }),
    prisma.adminRequestValidationRun.findMany({
      where: { statut: "EN_COURS" },
      include: { workflow: { include: { steps: true } }, adminRequest: { select: { titre: true, id: true } } },
    }),
    prisma.crmOpportunity.findMany({
      where: { ownerId: userId, statut: { notIn: ["GAGNEE", "PERDUE"] } },
      include: { interactions: { orderBy: { dateInteraction: "desc" }, take: 1 } },
    }),
    prisma.meetingDecision.findMany({
      where: { statut: "EN_COURS", responsableId: userId },
      select: { id: true, description: true, meetingId: true, projectId: true },
    }),
    prisma.governanceDecision.findMany({
      where: { statut: "EN_COURS", responsableId: userId },
      select: { id: true, objet: true, meetingId: true },
    }),
    prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true, participants: { where: { userId }, select: { lastReadAt: true } } },
    }),
  ]);

  const messagesNonLus = (
    await Promise.all(
      conversationsForUnread.map((conv) =>
        prisma.message.count({
          where: {
            conversationId: conv.id,
            authorId: { not: userId },
            createdAt: { gt: conv.participants[0]?.lastReadAt ?? new Date(0) },
          },
        })
      )
    )
  ).reduce((sum, n) => sum + n, 0);

  const memberProjectIdSet = new Set(memberProjectIds.map((m) => m.projectId));
  const projectsAtRisk = projectsOwned.filter(
    (p) => (p.dateFin !== null && p.dateFin < now) || p.risks.length > 0
  );
  // Projets ou l'utilisateur est simple membre (pas responsable) : comptes
  // separement pour eviter de refaire la meme requete avec un where OR sur
  // responsableId/members (Prisma ne permet pas facilement de mixer les
  // deux filtres de risque dans un seul findMany lisible).
  const memberProjectsAtRiskCount =
    memberProjectIdSet.size > 0
      ? await prisma.project.count({
          where: {
            id: { in: Array.from(memberProjectIdSet) },
            statut: "EN_COURS",
            responsableId: { not: userId },
            OR: [{ dateFin: { lt: now } }, { risks: { some: { impact: "ELEVE", probabilite: "ELEVEE", statut: { notIn: ["MAITRISE", "CLOS"] } } } }],
          },
        })
      : 0;

  const pendingValidationsForUser = [
    ...blockedTaskRuns
      .filter((r) => r.workflow.steps.find((s) => s.ordre === r.currentOrdre)?.approverRole === user.role.key)
      .map((r) => ({ label: r.task.titre, href: `/taches/${r.task.id}` })),
    ...blockedAdminRuns
      .filter((r) => r.workflow.steps.find((s) => s.ordre === r.currentOrdre)?.approverRole === user.role.key)
      .map((r) => ({ label: r.adminRequest.titre, href: `/demandes/${r.adminRequest.id}` })),
  ];

  const staleCutoff = new Date(now.getTime() - OPPORTUNITY_STALE_MS);
  const opportunitesARelancer = staleOpportunities.filter((o) => {
    const last = o.interactions[0]?.dateInteraction ?? o.createdAt;
    return last < staleCutoff;
  });

  const decisions = [
    ...meetingDecisions.map((d) => ({
      label: d.description,
      href: d.meetingId ? `/reunions/${d.meetingId}` : d.projectId ? `/projets/${d.projectId}` : "/reunions",
    })),
    ...governanceDecisions.map((d) => ({ label: d.objet, href: `/gouvernance/reunions/${d.meetingId}` })),
  ];

  const prioriteRecommandee =
    priorityTasks.length > 0
      ? { label: priorityTasks[0].titre, href: `/taches/${priorityTasks[0].id}` }
      : projectsAtRisk.length > 0
        ? { label: projectsAtRisk[0].nom, href: `/projets/${projectsAtRisk[0].id}` }
        : decisions.length > 0
          ? decisions[0]
          : pendingValidationsForUser.length > 0
            ? pendingValidationsForUser[0]
            : null;

  return {
    tachesPrioritaires: priorityTasks.length,
    reunions: meetingsToday,
    projetsARisque: projectsAtRisk.length + memberProjectsAtRiskCount,
    validationsEnAttente: pendingValidationsForUser.length,
    opportunitesARelancer: opportunitesARelancer.length,
    decisionsATraiter: decisions.length,
    messagesNonLus,
    prioriteRecommandee,
  };
}
