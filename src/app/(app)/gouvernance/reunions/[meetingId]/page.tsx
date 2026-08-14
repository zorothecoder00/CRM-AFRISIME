import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GovernanceCompteRenduForm } from "@/components/gouvernance/governance-compte-rendu-form";
import { GovernanceDecisionsSection } from "@/components/gouvernance/governance-decisions-section";
import { GovernanceDocumentFormDialog } from "@/components/gouvernance/governance-document-form-dialog";
import { GovernanceDocumentsSection } from "@/components/gouvernance/governance-documents-section";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function GovernanceMeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.GOVERNANCE_MANAGE);

  const [meeting, users] = await Promise.all([
    prisma.governanceMeeting.findUnique({
      where: { id: meetingId },
      include: {
        instance: true,
        createdBy: true,
        participants: { include: { user: true } },
        decisions: { include: { responsable: true }, orderBy: { createdAt: "asc" } },
        documents: { include: { uploadedBy: true } },
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
            <Badge variant={toneForStatus(meeting.statut)}>{STATUS_LABELS[meeting.statut]}</Badge>
          </div>
          <Link href={`/gouvernance/${meeting.instanceId}`} className="text-sm text-muted-foreground hover:underline">
            {meeting.instance.nom}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(meeting.dateHeure).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
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
            <GovernanceCompteRenduForm
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
            <GovernanceDecisionsSection
              meetingId={meeting.id}
              decisions={meeting.decisions.map((d) => ({
                id: d.id,
                reference: d.reference,
                objet: d.objet,
                contexte: d.contexte,
                decision: d.decision,
                statut: d.statut,
                priorite: d.priorite,
                responsableName: d.responsable?.name ?? null,
                echeance: d.echeance ? d.echeance.toISOString() : null,
              }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents préparatoires</CardTitle>
            {canManage && <GovernanceDocumentFormDialog meetingId={meeting.id} />}
          </CardHeader>
          <CardContent>
            <GovernanceDocumentsSection
              documents={meeting.documents.map((doc) => ({
                id: doc.id,
                nom: doc.nom,
                url: doc.url,
                uploadedByName: doc.uploadedBy.name,
              }))}
              canManage={canManage}
            />
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
