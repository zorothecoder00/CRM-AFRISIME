import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentClassifyRow } from "@/components/data-governance/document-classify-row";

// Data Governance (cahier des charges V3.0 §46) — propriétaires,
// classification, sensibilité, qualité, accès, conservation, archivage,
// historique. Seule "classification" (niveau/sensibilité/qualité/
// propriétaire) est une capacité réellement nouvelle (DataClassification) ;
// les 4 autres facettes réutilisent des mécanismes déjà en place — voir
// liens ci-dessous plutôt qu'une duplication d'UI.
export default async function GouvernanceDonneesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DATA_BACKUP_MANAGE)) {
    redirect("/dashboard");
  }

  const [documents, classifications, users, accessGrantsCount, retentionPoliciesCount, archivedCount, auditLogCount] =
    await Promise.all([
      prisma.document.findMany({
        where: { estArchive: false },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, nom: true },
      }),
      prisma.dataClassification.findMany({ where: { entityType: "Document" } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.documentAccess.count(),
      prisma.retentionPolicy.count({ where: { isActive: true } }),
      prisma.document.count({ where: { estArchive: true } }),
      prisma.auditLog.count(),
    ]);

  const classificationByDocId = new Map(classifications.map((c) => [c.entityId, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gouvernance des données</h1>
        <p className="text-sm text-muted-foreground">
          Propriétaires, classification, sensibilité, qualité, accès, conservation, archivage, historique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Accès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{accessGrantsCount} accès document accordé(s)</p>
            <Link href="/administration/acces-avances" className="text-xs text-primary underline">
              Gérer les accès →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conservation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{retentionPoliciesCount} politique(s) active(s)</p>
            <Link href="/administration/donnees" className="text-xs text-primary underline">
              Gérer la conservation →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Archivage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{archivedCount} document(s) archivé(s)</p>
            <Link href="/documents" className="text-xs text-primary underline">
              Voir les documents →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{auditLogCount} événement(s) journalisé(s)</p>
            <Link href="/administration/audit" className="text-xs text-primary underline">
              Voir le journal →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification des documents (50 plus récents)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document.</p>
          ) : (
            documents.map((doc) => {
              const c = classificationByDocId.get(doc.id);
              return (
                <DocumentClassifyRow
                  key={doc.id}
                  data={{
                    documentId: doc.id,
                    documentNom: doc.nom,
                    niveau: c?.niveau ?? "INTERNE",
                    sensibilite: c?.sensibilite ?? "NORMALE",
                    qualite: c?.qualite ?? "NON_EVALUEE",
                    proprietaireId: c?.proprietaireId ?? "",
                  }}
                  users={users.map((u) => ({ id: u.id, label: u.name }))}
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
