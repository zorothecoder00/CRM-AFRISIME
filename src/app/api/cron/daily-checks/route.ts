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

/**
 * Ordonnanceur quotidien (cahier des charges §15 : rappels d'échéance
 * proactifs, plutôt que calculés à la visite de page ; §14 : alerte de
 * surcharge). Déclenché par Vercel Cron (voir vercel.json), protégé par
 * CRON_SECRET pour empêcher un appel public.
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

  return NextResponse.json({
    usersChecked: users.length,
    overloadedCount: overloaded.length,
  });
}
