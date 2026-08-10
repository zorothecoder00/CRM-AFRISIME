import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompteRenduForm } from "@/components/meetings/compte-rendu-form";
import { DecisionsSection } from "@/components/meetings/decisions-section";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;

  const [meeting, users] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        project: true,
        createdBy: true,
        participants: { include: { user: true } },
        decisions: { include: { responsable: true }, orderBy: { createdAt: "asc" } },
        attachments: true,
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{meeting.titre}</h1>
            <Badge variant="secondary">{STATUS_LABELS[meeting.statut]}</Badge>
          </div>
          <Link href={`/projets/${meeting.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {meeting.project.nom}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(meeting.dateHeure).toLocaleString("fr-FR", {
              dateStyle: "full",
              timeStyle: "short",
            })}
            {meeting.lieu ? ` · ${meeting.lieu}` : ""}
          </p>
        </div>

        {meeting.ordreDuJour && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ordre du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{meeting.ordreDuJour}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compte rendu</CardTitle>
          </CardHeader>
          <CardContent>
            <CompteRenduForm
              meetingId={meeting.id}
              initialCompteRendu={meeting.compteRendu ?? ""}
              initialStatut={meeting.statut}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Décisions &amp; actions</CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionsSection
              meetingId={meeting.id}
              decisions={meeting.decisions.map((d) => ({
                id: d.id,
                description: d.description,
                responsableName: d.responsable?.name ?? null,
                echeance: d.echeance ? d.echeance.toISOString() : null,
                taskId: d.taskId,
              }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pièces jointes</CardTitle>
          </CardHeader>
          <CardContent>
            {meeting.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {meeting.attachments.map((a) => (
                  <li key={a.id}>{a.fileName}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {meeting.participants.map((p) => (
                <li key={p.userId}>{p.user.name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organisateur</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{meeting.createdBy.name}</CardContent>
        </Card>
      </div>
    </div>
  );
}
