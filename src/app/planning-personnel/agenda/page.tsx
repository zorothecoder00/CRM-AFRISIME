import { getServerSession } from "next-auth";
import { subYears, addYears } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { PersonalPlanningTimeline } from "@/components/personal-planning/personal-planning-timeline";
import { AgendaExportButton, type AgendaExportRow } from "@/components/personal-planning/agenda-export-button";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { CalendarRange } from "lucide-react";

/**
 * "Agenda consolidé" (prototype V2) — chronologie UNIQUE de toutes les
 * activités personnelles (pas une vue filtrée par jour/semaine comme
 * ?vue=agenda sur le hub), avec export. Fenêtre ±2 ans, même convention que
 * "En retard"/"À venir" sur le hub pour représenter "tout le planning".
 */
export default async function PersonalPlanningAgendaPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const rangeStart = subYears(now, 2);
  const rangeEnd = addYears(now, 2);

  const [entriesRaw, meetingsRaw] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: rangeEnd }, dateFin: { gte: rangeStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId } }, dateHeure: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
  ]);

  const entries = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const exportRows: AgendaExportRow[] = entries.map((e) => ({
    titre: e.titre,
    dateDebut: e.dateDebut,
    dateFin: e.dateFin,
    type: e.type,
    statut: e.statut,
    lieu: e.lieu,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Agenda consolidé</h1>
            <p className="text-sm text-muted-foreground">Une chronologie unique de toutes vos activités ({entries.length}).</p>
          </div>
        </div>
        <AgendaExportButton rows={exportRows} />
      </div>

      <PersonalPlanningTimeline entries={entries} />
    </div>
  );
}
