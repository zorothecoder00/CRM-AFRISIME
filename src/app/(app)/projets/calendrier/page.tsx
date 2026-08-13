import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectVisibilityWhere } from "@/lib/portal-scope";
import { toneForStatus, toneForMilestoneStatus } from "@/lib/status-tone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectMonthGrid, dateKey, type ProjectCalendarDayItems } from "@/components/projects/project-month-grid";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const MILESTONE_STATUS_LABELS: Record<string, string> = { A_VENIR: "À venir", ATTEINT: "Atteint", MANQUE: "Manqué" };

export default async function ProjetsCalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string; jour?: string }>;
}) {
  const { annee, mois, jour } = await searchParams;
  const session = await getServerSession(authOptions);
  const where = projectVisibilityWhere(session!.user.roleKey, session!.user.id);

  const now = new Date();
  const year = annee ? parseInt(annee, 10) : now.getFullYear();
  const month = mois ? parseInt(mois, 10) : now.getMonth() + 1;
  const currentMonth = new Date(year, month - 1, 1);

  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const [projects, milestones] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...where,
        dateDebut: { lte: gridEnd },
        OR: [{ dateFin: { gte: gridStart } }, { dateFin: null, dateDebut: { gte: gridStart } }],
      },
      select: { id: true, nom: true, statut: true, dateDebut: true, dateFin: true },
    }),
    prisma.projectMilestone.findMany({
      where: { dateCible: { gte: gridStart, lte: gridEnd }, project: where },
      include: { project: { select: { id: true, nom: true } } },
    }),
  ]);

  const itemsByDate = new Map<string, ProjectCalendarDayItems>();
  function ensure(key: string): ProjectCalendarDayItems {
    if (!itemsByDate.has(key)) itemsByDate.set(key, { projects: [], milestones: [] });
    return itemsByDate.get(key)!;
  }

  for (const day of days) {
    const key = dateKey(day);
    for (const p of projects) {
      if (!p.dateDebut) continue;
      if (isWithinInterval(day, { start: startOfDay(p.dateDebut), end: endOfDay(p.dateFin ?? p.dateDebut) })) {
        ensure(key).projects.push({ id: p.id, nom: p.nom });
      }
    }
  }
  for (const m of milestones) {
    ensure(dateKey(m.dateCible)).milestones.push({ id: m.id, nom: m.nom, projectId: m.project.id, projectNom: m.project.nom });
  }

  const selectedKey = jour;
  const selectedItems = selectedKey ? itemsByDate.get(selectedKey) : undefined;

  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);
  const monthHref = (d: Date) => `/projets/calendrier?annee=${d.getFullYear()}&mois=${d.getMonth() + 1}`;
  const dayHref = (key: string) => `/projets/calendrier?annee=${year}&mois=${month}&jour=${key}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendrier des projets</h1>
          <p className="text-sm text-muted-foreground">
            Planning de tous les projets (début-fin) et de leurs jalons.
          </p>
        </div>
        <Link href="/projets">
          <Button variant="outline" size="sm">
            Retour aux projets
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link href={monthHref(prevMonth)}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-lg font-medium capitalize">{format(currentMonth, "MMMM yyyy", { locale: fr })}</span>
        <Link href={monthHref(nextMonth)}>
          <Button variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <ProjectMonthGrid
        days={days}
        currentMonth={currentMonth}
        selectedDateKey={selectedKey}
        itemsByDate={itemsByDate}
        dayHref={dayHref}
      />

      {selectedKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{format(parseISO(selectedKey), "EEEE d MMMM yyyy", { locale: fr })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selectedItems && <p className="text-muted-foreground">Aucun projet ni jalon ce jour-là.</p>}
            {selectedItems?.projects.map((p) => {
              const full = projects.find((proj) => proj.id === p.id);
              return (
                <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-2 hover:underline">
                  <Badge variant="outline">Projet</Badge>
                  {p.nom}
                  {full && <Badge variant={toneForStatus(full.statut)}>{STATUS_LABELS[full.statut]}</Badge>}
                </Link>
              );
            })}
            {selectedItems?.milestones.map((m) => {
              const full = milestones.find((ms) => ms.id === m.id);
              return (
                <Link key={m.id} href={`/projets/${m.projectId}`} className="flex items-center gap-2 hover:underline">
                  <Badge variant="outline">Jalon</Badge>
                  {m.nom}
                  <span className="text-muted-foreground">— {m.projectNom}</span>
                  {full && <Badge variant={toneForMilestoneStatus(full.statut)}>{MILESTONE_STATUS_LABELS[full.statut]}</Badge>}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
