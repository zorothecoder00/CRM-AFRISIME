import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, toneForPriority, accentForStatus } from "@/lib/status-tone";
import { PortalHeader } from "@/components/portal/portal-header";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalDocumentUploadForm } from "@/components/portal/portal-document-upload-form";
import { PortalDeliverableReview } from "@/components/portal/portal-deliverable-review";
import { FileText } from "lucide-react";

const VALIDATION_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente de votre validation",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

export default async function PortalMissionDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({ where: { id: session.contactId } });
  if (!contact) redirect("/portail/connexion");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task || task.externalContactId !== contact.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <PortalHeader
        name={`${contact.prenom} ${contact.nom}`}
        email={session.email}
        label={portalLabelForContactType(contact.type)}
      />
      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{task.titre}</h1>
          <Badge variant={toneForStatus(task.statut)}>{STATUS_LABELS[task.statut] ?? task.statut}</Badge>
          <Badge variant={toneForPriority(task.priorite)}>{PRIORITY_LABELS[task.priorite] ?? task.priorite}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{task.project.nom}</p>

        <Card accent={accentForStatus(task.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Avancement" value={`${task.avancement}%`} />
            <Info
              label="Échéance"
              value={task.echeance ? task.echeance.toLocaleDateString("fr-FR") : "—"}
            />
          </CardContent>
          {task.description && (
            <CardContent className="pt-0">
              <p className="whitespace-pre-wrap text-sm">{task.description}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents &amp; livrables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {task.documents.map((doc) => (
                  <li key={doc.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {doc.nom}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {doc.createdAt.toLocaleDateString("fr-FR")}
                      </span>
                    </a>
                    {doc.validationExterne !== "NON_REQUISE" && (
                      <div className="mt-2 space-y-2 border-t pt-2">
                        <Badge
                          variant={
                            doc.validationExterne === "VALIDE"
                              ? "success"
                              : doc.validationExterne === "REJETE"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {VALIDATION_LABELS[doc.validationExterne]}
                        </Badge>
                        {doc.validationExterne === "EN_ATTENTE" && <PortalDeliverableReview documentId={doc.id} />}
                        {doc.commentaireValidationExterne && (
                          <p className="text-xs text-muted-foreground">« {doc.commentaireValidationExterne} »</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <PortalDocumentUploadForm taskId={task.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
