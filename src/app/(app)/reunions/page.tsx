import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { ContextualBackLink } from "@/components/ui/contextual-back-link";
import { Repeat } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PERIOD_LABELS = { avenir: "À venir", passees: "Passées", toutes: "Toutes" } as const;

export default async function ReunionsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; from?: string }>;
}) {
  const { periode = "avenir", from } = await searchParams;
  const now = new Date();
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  // Depuis Planning personnel, on ne montre que MES reunions (organisateur
  // ou participant) — pas celles de toute l'organisation.
  const personalScope =
    from === "planning-personnel" ? { OR: [{ createdById: userId }, { participants: { some: { userId } } }] } : {};

  const [meetings, projects, users] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        ...(periode === "avenir" ? { dateHeure: { gte: now } } : periode === "passees" ? { dateHeure: { lt: now } } : {}),
        ...personalScope,
      },
      include: { project: true, participants: true },
      orderBy: { dateHeure: periode === "passees" ? "desc" : "asc" },
    }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <ContextualBackLink from={from} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Réunions</h1>
          <p className="text-sm text-muted-foreground">{meetings.length} réunion(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border">
            {Object.entries(PERIOD_LABELS).map(([key, label], i) => (
              <Link key={key} href={`/reunions?periode=${key}`}>
                <Button
                  variant={periode === key ? "default" : "ghost"}
                  size="sm"
                  className={i === 0 ? "rounded-r-none" : i === Object.keys(PERIOD_LABELS).length - 1 ? "rounded-l-none" : "rounded-none"}
                >
                  {label}
                </Button>
              </Link>
            ))}
          </div>
          <MeetingFormDialog
            projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.map((meeting) => (
          <Link key={meeting.id} href={`/reunions/${meeting.id}`}>
            <Card
              accent={accentForStatus(meeting.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  {meeting.titre}
                  {meeting.recurrence !== "AUCUNE" && (
                    <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Réunion récurrente" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{meeting.project?.nom ?? "Sans projet"}</p>
                <p className="text-sm">
                  {new Date(meeting.dateHeure).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForStatus(meeting.statut)}>{STATUS_LABELS[meeting.statut]}</Badge>
                  <Badge variant="outline">{meeting.participants.length} participant(s)</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {meetings.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune réunion pour le moment.</p>
        )}
      </div>
    </div>
  );
}
