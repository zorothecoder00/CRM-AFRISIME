import Link from "next/link";
import { getServerSession } from "next-auth";
import { subYears, addYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanningTimeline } from "@/components/personal-planning/personal-planning-timeline";
import { AgendaExportButton, type AgendaExportRow } from "@/components/personal-planning/agenda-export-button";
import { AgendaShareCard } from "@/components/personal-planning/agenda-share-card";
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

  const [entriesRaw, meetingsRaw, shares, colleagues, sharedWithMe] = await Promise.all([
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
    // Partage d'agenda (demande utilisateur — "partager avec une secrétaire").
    prisma.personalPlanningShare.findMany({
      where: { ownerId: userId },
      include: { grantee: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // Agendas que d'autres m'ont partagé — sinon aucun lien nulle part
    // n'amène à /planning-personnel/equipe/[userId] pour un bénéficiaire
    // sans lien hiérarchique.
    prisma.personalPlanningShare.findMany({
      where: { granteeId: userId },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
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
    <div className="space-y-6">

      <div className="space-y-4 rounded-md border bg-card p-4">
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

      <AgendaShareCard
        shares={shares.map((s) => ({ id: s.id, granteeId: s.granteeId, granteeName: s.grantee.name, role: s.role }))}
        colleagues={colleagues.map((c) => ({ id: c.id, label: c.name }))}
      />

      {sharedWithMe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agendas partagés avec moi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {sharedWithMe.map((s) => (
              <Link
                key={s.id}
                href={`/planning-personnel/equipe/${s.owner.id}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
              >
                {s.owner.name}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
