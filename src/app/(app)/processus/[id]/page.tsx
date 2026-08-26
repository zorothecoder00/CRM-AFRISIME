import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeProcessusAnalytics } from "@/lib/processus-analytics";
import { EtapesDesigner } from "@/components/processus/etapes-designer";
import { AnalyticsPanel } from "@/components/processus/analytics-panel";
import { ExecutionPanel } from "@/components/processus/execution-panel";
import { ProcessusStatutForm } from "@/components/processus/processus-statut-form";
import { ProcessusDocumentFormDialog } from "@/components/processus/processus-document-form-dialog";
import { ProcessusDocumentsSection } from "@/components/processus/processus-documents-section";
import { getTagsFor } from "@/lib/tags";
import { EntityTagsEditor } from "@/components/tags/entity-tags-editor";
import { BackLink } from "@/components/ui/back-link";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  ARCHIVE: "Archivé",
};

export default async function ProcessusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROCESS_MANAGE);

  const [processus, users, analytics] = await Promise.all([
    prisma.processus.findUnique({
      where: { id },
      include: {
        responsable: true,
        createdBy: true,
        etapes: { orderBy: { ordre: "asc" }, include: { responsable: true } },
        executions: { orderBy: { dateDebut: "desc" }, include: { etapeActuelle: true } },
        versions: { orderBy: { createdAt: "desc" } },
        documents: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    computeProcessusAnalytics(id),
  ]);

  if (!processus) {
    notFound();
  }

  const tags = await getTagsFor("Processus", processus.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <BackLink href="/processus" label="Retour aux processus" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{processus.nom}</h1>
            <Badge variant={toneForStatus(processus.statut)}>{STATUT_LABELS[processus.statut]}</Badge>
            <Badge variant="outline">v{processus.version}</Badge>
          </div>
          {processus.description && <p className="mt-1 text-sm text-muted-foreground">{processus.description}</p>}
          {processus.responsable && (
            <p className="mt-1 text-sm text-muted-foreground">Responsable : {processus.responsable.name}</p>
          )}
          <div className="mt-2">
            <EntityTagsEditor entityType="Processus" entityId={processus.id} initialTags={tags} canManage={canManage} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <EtapesDesigner
              processusId={processus.id}
              etapes={processus.etapes.map((e) => ({
                id: e.id,
                nom: e.nom,
                responsableName: e.responsable?.name ?? null,
                delaiJours: e.delaiJours,
                entrees: e.entrees,
                sorties: e.sorties,
                regles: e.regles,
              }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPanel analytics={analytics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents</CardTitle>
            {canManage && <ProcessusDocumentFormDialog processusId={processus.id} />}
          </CardHeader>
          <CardContent>
            <ProcessusDocumentsSection
              documents={processus.documents.map((doc) => ({
                id: doc.id,
                nom: doc.nom,
                url: doc.url,
                uploadedByName: doc.uploadedBy.name,
              }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exécutions</CardTitle>
          </CardHeader>
          <CardContent>
            <ExecutionPanel
              processusId={processus.id}
              executions={processus.executions.map((e) => ({
                id: e.id,
                libelle: e.libelle,
                statut: e.statut,
                etapeActuelleId: e.etapeActuelleId,
                etapeActuelleNom: e.etapeActuelle?.nom ?? null,
                dateDebut: e.dateDebut.toISOString(),
              }))}
              etapes={processus.etapes.map((e) => ({ id: e.id, nom: e.nom }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessusStatutForm processusId={processus.id} statut={processus.statut} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des versions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {processus.versions.map((v) => (
                <li key={v.id} className="rounded-md border p-2">
                  <p className="font-medium">Version {v.version}</p>
                  {v.note && <p className="text-xs text-muted-foreground">{v.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </li>
              ))}
              {processus.versions.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune version enregistrée.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
