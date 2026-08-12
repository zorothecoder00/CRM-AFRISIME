import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function ReunionsPage() {
  const [meetings, projects, users] = await Promise.all([
    prisma.meeting.findMany({
      include: { project: true, participants: true },
      orderBy: { dateHeure: "desc" },
    }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Réunions</h1>
          <p className="text-sm text-muted-foreground">{meetings.length} réunion(s)</p>
        </div>
        <MeetingFormDialog
          projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
          users={users.map((u) => ({ id: u.id, label: u.name }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.map((meeting) => (
          <Link key={meeting.id} href={`/reunions/${meeting.id}`}>
            <Card
              accent={accentForStatus(meeting.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{meeting.titre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{meeting.project.nom}</p>
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
