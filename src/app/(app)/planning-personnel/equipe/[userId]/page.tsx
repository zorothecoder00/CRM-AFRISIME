import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval, startOfDay, endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewPersonalPlanningOf } from "@/lib/personal-planning-access";
import { PersonalPlanningWeek, type PersonalPlanningDay } from "@/components/personal-planning/personal-planning-week";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { Lock, ChevronLeft } from "lucide-react";

/**
 * §46 — vue manager sur le planning personnel détaillé d'un subordonné
 * (accès direct hiérarchique ou chef d'équipe, voir `canViewPersonalPlanningOf`).
 * Volontairement minimale par rapport à `/planning-personnel` : une seule
 * vue (Semaine), en lecture seule, pas d'inbox ni de demandes — un simple
 * coup d'œil, pas un second poste de pilotage du planning d'autrui.
 */
export default async function SubordinatePersonalPlanningPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: targetUserId } = await params;
  const session = await getServerSession(authOptions);
  const allowed = await canViewPersonalPlanningOf(session!.user.id, targetUserId);
  if (!allowed) redirect("/dashboard");

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } });
  if (!target) notFound();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [entriesRaw, meetingsRaw] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId: targetUserId, dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId: targetUserId } }, dateHeure: { gte: weekStart, lte: weekEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
  ]);

  const entries = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ];

  // §39 — jours fériés/non ouvrables du SUBORDONNÉ (pas du manager qui consulte).
  const nonWorkingMap = await findNonWorkingDaysInRange(targetUserId, weekStart, weekEnd);

  const days: PersonalPlanningDay[] = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => ({
    key: day.toISOString(),
    dateKey: format(day, "yyyy-MM-dd"),
    label: format(day, "EEEE d", { locale: fr }),
    isToday: isSameDay(day, now),
    entries: entries
      .filter((e) => isWithinInterval(day, { start: startOfDay(new Date(e.dateDebut)), end: endOfDay(new Date(e.dateFin)) }))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
    nonWorkingReason: nonWorkingMap.get(format(day, "yyyy-MM-dd")) ?? null,
  }));

  return (
    <div className="space-y-4">
      <Link href={`/pilotage/utilisateur/${targetUserId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-center gap-3">
        <Lock className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Planning personnel de {target.name}</h1>
          <p className="text-sm text-muted-foreground">
            Vue en lecture seule — visible car vous êtes son manager ou chef d&apos;équipe (§46).
          </p>
        </div>
      </div>

      <PersonalPlanningWeek days={days} readOnly />
    </div>
  );
}
