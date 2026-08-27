import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalPlanningWeek, type PersonalPlanningDay } from "@/components/personal-planning/personal-planning-week";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import { RequestAvailabilityDialog } from "@/components/personal-planning/request-availability-dialog";
import { ReceivedRequestsSection } from "@/components/personal-planning/received-requests-section";
import { SentRequestsList } from "@/components/personal-planning/sent-requests-list";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

/**
 * Second planning, prive celui-ci (contrairement a /planning et /calendrier,
 * partages avec l'equipe via Task/Meeting/Leave/Event) : notes et creneaux
 * personnels, plus la disponibilite qu'ils exposent aux collegues via
 * AvailabilityRequest (demander/accepter/refuser un creneau).
 */
export default async function PlanningPersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const { semaine } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const refDate = semaine ? parseISO(semaine) : new Date();
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [entries, receivedRequests, sentRequests, colleagues] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId, dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.availabilityRequest.findMany({
      where: { targetUserId: userId, statut: "EN_ATTENTE" },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.availabilityRequest.findMany({
      where: { requestedById: userId },
      include: { targetUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const dayColumns: PersonalPlanningDay[] = days.map((day) => {
    const dayEntries = entries
      .filter((e) => isWithinInterval(day, { start: startOfDay(e.dateDebut), end: endOfDay(e.dateFin) }))
      .sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime())
      .map((e) => ({
        id: e.id,
        titre: e.titre,
        notes: e.notes,
        dateDebut: e.dateDebut.toISOString(),
        dateFin: e.dateFin.toISOString(),
        type: e.type,
      }));

    return {
      key: day.toISOString(),
      label: format(day, "EEEE d", { locale: fr }),
      isToday: isSameDay(day, new Date()),
      entries: dayEntries,
    };
  });

  const prevHref = `/planning-personnel?semaine=${format(subWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const nextHref = `/planning-personnel?semaine=${format(addWeeks(weekStart, 1), "yyyy-MM-dd")}`;
  const todayHref = `/planning-personnel`;

  const receivedRows = receivedRequests.map((r) => ({
    id: r.id,
    requestedByName: r.requestedBy.name,
    titre: r.titre,
    message: r.message,
    dateDebut: r.dateDebut.toISOString(),
    dateFin: r.dateFin.toISOString(),
  }));

  const sentRows = sentRequests.map((r) => ({
    id: r.id,
    targetUserName: r.targetUser.name,
    titre: r.titre,
    dateDebut: r.dateDebut.toISOString(),
    dateFin: r.dateFin.toISOString(),
    statut: r.statut,
    motifRefus: r.motifRefus,
  }));

  const colleagueOptions = colleagues.map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="size-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold">Planning personnel</h1>
              <p className="text-sm text-muted-foreground">
                Vos notes et créneaux privés — distinct du{" "}
                <Link href="/planning" className="text-primary hover:underline">
                  planning d&apos;activités
                </Link>
                . Seule votre disponibilité (occupé/libre) est visible des autres.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <RequestAvailabilityDialog colleagues={colleagueOptions} />
            <PersonalPlanningEntryFormDialog />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link href={prevHref}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Semaine du {format(weekStart, "d MMMM", { locale: fr })} au {format(weekEnd, "d MMMM yyyy", { locale: fr })}
            </span>
            <Link href={todayHref}>
              <Button variant="outline" size="sm">
                Aujourd&apos;hui
              </Button>
            </Link>
          </div>
          <Link href={nextHref}>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <PersonalPlanningWeek days={dayColumns} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demandes reçues</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceivedRequestsSection requests={receivedRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes demandes envoyées</CardTitle>
          </CardHeader>
          <CardContent>
            <SentRequestsList requests={sentRows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
