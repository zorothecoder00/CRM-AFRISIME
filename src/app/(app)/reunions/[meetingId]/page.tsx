import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompteRenduForm } from "@/components/meetings/compte-rendu-form";
import { DecisionsSection } from "@/components/meetings/decisions-section";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { DocumentList, type DocumentRow } from "@/components/documents/document-list";
import { documentUploaderName } from "@/lib/document-uploader";
import { MeetingExternalParticipantsSection } from "@/components/meetings/meeting-external-participants-section";
import { MeetingParticipantsSection } from "@/components/meetings/meeting-participants-section";
import { getTagsFor } from "@/lib/tags";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";

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

  const [meeting, users, contacts] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        project: true,
        createdBy: true,
        participants: { include: { user: true } },
        externalParticipants: { include: { contact: true }, orderBy: { invitedAt: "asc" } },
        decisions: { include: { responsable: true }, orderBy: { createdAt: "asc" } },
        documents: {
          include: { uploadedBy: true, uploadedByContact: true, task: true, _count: { select: { versions: true } } },
        },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
  ]);

  if (!meeting) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const canTag = session!.user.permissions.includes(PERMISSIONS.MEETING_UPDATE);
  const tags = await getTagsFor("Meeting", meeting.id);

  // Serie recurrente (cahier des charges §XI) : racine + toutes les
  // occurrences qui pointent vers elle, quel que soit le membre consulte.
  const seriesRootId = meeting.recurrenceParentId ?? meeting.id;
  const seriesMeetings =
    meeting.recurrence !== "AUCUNE" || meeting.recurrenceParentId
      ? await prisma.meeting.findMany({
          where: { OR: [{ id: seriesRootId }, { recurrenceParentId: seriesRootId }] },
          orderBy: { dateHeure: "asc" },
          select: { id: true, dateHeure: true, statut: true },
        })
      : [];

  const documentRows: DocumentRow[] = meeting.documents.map((d) => ({
    id: d.id,
    nom: d.nom,
    description: d.description,
    uploadedByName: documentUploaderName(d),
    createdAt: d.createdAt.toISOString(),
    versionCount: d._count.versions,
    taskTitre: d.task?.titre ?? null,
    taskId: d.taskId,
    meetingTitre: null,
    meetingId: null,
    type: d.type,
    statutSignature: d.statutSignature,
    estArchive: d.estArchive,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{meeting.titre}</h1>
            <Badge variant={toneForStatus(meeting.statut)}>{STATUS_LABELS[meeting.statut]}</Badge>
          </div>
          <Link href={`/projets/${meeting.projectId}`} className="text-sm text-muted-foreground hover:underline">
            {meeting.project.nom}
          </Link>
          <div className="mt-2">
            <EntityTagsEditor entityType="Meeting" entityId={meeting.id} initialTags={tags} canManage={canTag} />
          </div>
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
                motif: d.motif,
                statut: d.statut,
                responsableName: d.responsable?.name ?? null,
                echeance: d.echeance ? d.echeance.toISOString() : null,
                taskId: d.taskId,
              }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents liés</CardTitle>
            <DocumentFormDialog
              projectId={meeting.projectId}
              meetingId={meeting.id}
              triggerLabel="Lier un document"
            />
          </CardHeader>
          <CardContent>
            <DocumentList documents={documentRows} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingParticipantsSection
              meetingId={meeting.id}
              participants={meeting.participants.map((p) => ({
                userId: p.userId,
                userName: p.user.name,
                present: p.present,
              }))}
              canManage={canTag}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organisateur</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{meeting.createdBy.name}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participants externes</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingExternalParticipantsSection
              meetingId={meeting.id}
              participants={meeting.externalParticipants.map((p) => ({
                id: p.id,
                contactId: p.contactId,
                contactName: `${p.contact.prenom} ${p.contact.nom}`,
                rsvp: p.rsvp,
              }))}
              contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
            />
          </CardContent>
        </Card>

        {seriesMeetings.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Réunions de la série ({seriesMeetings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {seriesMeetings.map((m) => (
                  <li key={m.id}>
                    {m.id === meeting.id ? (
                      <span className="font-medium">
                        {new Date(m.dateHeure).toLocaleDateString("fr-FR")} (actuelle)
                      </span>
                    ) : (
                      <Link href={`/reunions/${m.id}`} className="text-primary hover:underline">
                        {new Date(m.dateHeure).toLocaleDateString("fr-FR")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
