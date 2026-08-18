import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// Meme principe que isoWeekKey dans daily-checks/route.ts (entityId
// deterministe par semaine ISO, deduplique via la contrainte unique de
// Notification — une seule notification par utilisateur et par semaine
// meme si le cron est redeclenche).
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

/**
 * Weekly Business Review IA (cahier des charges V2.2 §31) — "le système
 * génère automatiquement un rapport hebdomadaire". Ne stocke pas de fichier
 * généré : notifie les dirigeants (EXECUTIVE_VIEW, cf. §29) que la revue de
 * la semaine est prête, le contenu réel est recalculé à la demande au clic
 * (voir getReportData("REVUE_HEBDOMADAIRE") dans src/lib/reports.ts,
 * exposé sur /rapports). Déclenché par Vercel Cron (voir vercel.json),
 * protégé par CRON_SECRET comme daily-checks.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
  });

  const recipients = users.filter((u) =>
    hasPermission(
      u.role.permissions.map((p) => p.permission.key),
      PERMISSIONS.EXECUTIVE_VIEW
    )
  );

  const weekKey = isoWeekKey(new Date());
  await Promise.all(
    recipients.map((u) =>
      createNotification({
        userId: u.id,
        type: "RAPPORT_HEBDOMADAIRE",
        titre: "Votre Weekly Business Review est disponible.",
        lien: "/rapports",
        entityType: "WeeklyReview",
        entityId: weekKey,
      })
    )
  );

  return NextResponse.json({ notified: recipients.length });
}
