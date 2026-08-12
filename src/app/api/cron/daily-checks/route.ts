import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeadlineNotifications, createNotification } from "@/lib/notify";
import { computeWorkload } from "@/lib/workload";

// Numéro de semaine ISO — utilisé pour que l'alerte de surcharge (§14) ne se
// répète qu'une fois par semaine par utilisateur (idempotence via la
// contrainte unique de Notification), pas à chaque exécution du cron.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

const BLOCKED_VALIDATION_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
const CLIENT_STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Ordonnanceur quotidien (cahier des charges §15 : rappels d'échéance
 * proactifs, plutôt que calculés à la visite de page ; §14 : alertes de
 * surcharge, objectif en retard, validation bloquée, client sans suivi,
 * budget dépassé). Déclenché par Vercel Cron (voir vercel.json), protégé
 * par CRON_SECRET pour empêcher un appel public.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [users, tasks, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
    }),
    prisma.task.findMany({
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
  ]);

  await Promise.all(users.map((u) => generateDeadlineNotifications(u.id)));

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
    leaves.map((l) => ({
      userId: l.userId,
      dateDebut: l.dateDebut,
      dateFin: l.dateFin,
      statut: l.statut,
    }))
  );

  const weekKey = isoWeekKey(new Date());
  const overloaded = workload.filter((w) => w.enSurcharge);
  await Promise.all(
    overloaded.map((w) =>
      createNotification({
        userId: w.userId,
        type: "SURCHARGE",
        titre: `Charge de travail élevée (${w.tauxOccupation}% de votre capacité).`,
        lien: "/charge-de-travail",
        entityType: "Workload",
        entityId: `${w.userId}-${weekKey}`,
      })
    )
  );

  // Objectifs en retard (§14) : période dépassée sans que le statut ait été
  // clos (ATTEINT/NON_ATTEINT/ANNULE).
  const lateObjectives = await prisma.objective.findMany({
    where: { statut: "EN_COURS", dateFin: { lt: new Date() } },
    select: { id: true, titre: true, userId: true, createdById: true },
  });
  await Promise.all(
    lateObjectives.map((o) =>
      createNotification({
        userId: o.userId ?? o.createdById,
        type: "RETARD",
        titre: `Objectif en retard : ${o.titre}`,
        lien: `/objectifs/${o.id}`,
        entityType: "Objective",
        entityId: o.id,
      })
    )
  );

  // Validations bloquées (§14) : circuit en cours dont l'étape courante n'a
  // pas bougé depuis plus de 3 jours — on notifie tous les utilisateurs du
  // rôle approbateur de cette étape.
  const blockedSince = new Date(Date.now() - BLOCKED_VALIDATION_THRESHOLD_MS);
  const [blockedTaskRuns, blockedAdminRequestRuns] = await Promise.all([
    prisma.taskValidationRun.findMany({
      where: { statut: "EN_COURS", updatedAt: { lt: blockedSince } },
      include: { task: true, workflow: { include: { steps: true } } },
    }),
    prisma.adminRequestValidationRun.findMany({
      where: { statut: "EN_COURS", updatedAt: { lt: blockedSince } },
      include: { adminRequest: true, workflow: { include: { steps: true } } },
    }),
  ]);

  async function notifyCurrentApprovers(approverRole: string, titre: string, lien: string, entityType: string, entityId: string) {
    const approvers = await prisma.user.findMany({
      where: { isActive: true, role: { key: approverRole as never } },
      select: { id: true },
    });
    await Promise.all(
      approvers.map((a) =>
        createNotification({ userId: a.id, type: "VALIDATION", titre, lien, entityType, entityId })
      )
    );
  }

  await Promise.all(
    blockedTaskRuns.map((run) => {
      const step = run.workflow.steps.find((s) => s.ordre === run.currentOrdre);
      if (!step) return Promise.resolve();
      return notifyCurrentApprovers(
        step.approverRole,
        `Validation bloquée depuis plus de 3 jours : ${run.task.titre}`,
        `/taches/${run.taskId}`,
        "TaskValidationRun",
        run.id
      );
    })
  );
  await Promise.all(
    blockedAdminRequestRuns.map((run) => {
      const step = run.workflow.steps.find((s) => s.ordre === run.currentOrdre);
      if (!step) return Promise.resolve();
      return notifyCurrentApprovers(
        step.approverRole,
        `Demande bloquée depuis plus de 3 jours : ${run.adminRequest.titre}`,
        `/demandes/${run.adminRequestId}`,
        "AdminRequestValidationRun",
        run.id
      );
    })
  );

  // Clients sans suivi depuis 30 jours (§14) : dernière interaction (ou
  // création si aucune) antérieure au seuil.
  const staleClientCutoff = new Date(Date.now() - CLIENT_STALE_THRESHOLD_MS);
  const clients = await prisma.crmContact.findMany({
    where: { type: "CLIENT" },
    include: { interactions: { orderBy: { dateInteraction: "desc" }, take: 1 } },
  });
  const staleClients = clients.filter((c) => {
    const lastContact = c.interactions[0]?.dateInteraction ?? c.createdAt;
    return lastContact < staleClientCutoff;
  });
  await Promise.all(
    staleClients.map((c) =>
      createNotification({
        userId: c.ownerId ?? c.createdById,
        type: "CLIENT_SANS_SUIVI",
        titre: `Client sans suivi depuis 30 jours : ${c.prenom} ${c.nom}`,
        lien: `/crm/contacts/${c.id}`,
        entityType: "CrmContact",
        entityId: c.id,
      })
    )
  );

  // Budget dépassé (§14) : coût réel saisi manuellement au-delà du budget.
  const overBudgetProjects = await prisma.project.findMany({
    where: { budget: { not: null }, coutReel: { not: null } },
    select: { id: true, nom: true, budget: true, coutReel: true, responsableId: true },
  });
  const overBudget = overBudgetProjects.filter(
    (p) => p.coutReel !== null && p.budget !== null && Number(p.coutReel) > Number(p.budget)
  );
  await Promise.all(
    overBudget.map((p) =>
      createNotification({
        userId: p.responsableId,
        type: "BUDGET_DEPASSE",
        titre: `Budget dépassé : ${p.nom}`,
        lien: `/projets/${p.id}`,
        entityType: "Project",
        entityId: p.id,
      })
    )
  );

  return NextResponse.json({
    usersChecked: users.length,
    overloadedCount: overloaded.length,
    lateObjectivesCount: lateObjectives.length,
    blockedValidationsCount: blockedTaskRuns.length + blockedAdminRequestRuns.length,
    staleClientsCount: staleClients.length,
    overBudgetCount: overBudget.length,
  });
}
