import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentFilingRow } from "@/components/documents/document-filing-row";

export type DocumentRow = {
  id: string;
  nom: string;
  description: string | null;
  projectNom?: string;
  uploadedByName: string;
  createdAt: string;
  versionCount: number;
  taskTitre: string | null;
  taskId: string | null;
  meetingTitre: string | null;
  meetingId: string | null;
  type: string;
  statutSignature: string;
  estArchive: boolean;
  /** Dossier courant (requis pour le menu "Ranger dans…"). */
  folderId?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  AUTRE: "Autre",
  CONTRAT: "Contrat",
  RAPPORT: "Rapport",
  FACTURE: "Facture",
  PROCES_VERBAL: "Procès-verbal",
  LIVRABLE: "Livrable",
  MODELE: "Modèle",
};

const SIGNATURE_LABELS: Record<string, string> = {
  NON_REQUISE: "Non requise",
  EN_ATTENTE: "Signature en attente",
  SIGNE: "Signé",
  REFUSE: "Signature refusée",
};

export function DocumentList({
  documents,
  cardClassName,
  moveFolders,
  canCreateFolder = false,
}: {
  documents: DocumentRow[];
  /** Classes en plus sur chaque carte document (ex. teinte de fond). */
  cardClassName?: string;
  /** Dossiers de l'espace : rend chaque document rangeable (clic droit ou bouton "Ranger"). */
  moveFolders?: { id: string; label: string }[];
  /** Propose aussi "Nouveau dossier avec ce document" dans ce menu. */
  canCreateFolder?: boolean;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => {
        const card = (
          <Link href={`/documents/${doc.id}`}>
            <Card
              size="sm"
              className={cn(
                "flex-row flex-wrap items-center justify-between gap-2 transition-all hover:-translate-y-0.5 hover:bg-muted/50 sm:flex-nowrap",
                // Place pour le bouton "Ranger" pose par-dessus, a droite.
                moveFolders && "pr-10",
                cardClassName
              )}
            >
              <div className="flex items-center gap-2 px-(--card-spacing)">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{doc.nom}</div>
                  {doc.projectNom && (
                    <div className="text-xs text-muted-foreground">{doc.projectNom}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-(--card-spacing) text-xs text-muted-foreground">
                {doc.type !== "AUTRE" && <Badge variant="secondary">{TYPE_LABELS[doc.type]}</Badge>}
                {doc.type === "CONTRAT" && doc.statutSignature !== "NON_REQUISE" && (
                  <Badge variant={doc.statutSignature === "SIGNE" ? "success" : "warning"}>
                    {SIGNATURE_LABELS[doc.statutSignature]}
                  </Badge>
                )}
                {doc.estArchive && <Badge variant="outline">Archivé</Badge>}
                {doc.taskId && <Badge variant="outline">Tâche : {doc.taskTitre}</Badge>}
                {doc.meetingId && <Badge variant="outline">Réunion : {doc.meetingTitre}</Badge>}
                <Badge variant="secondary">{doc.versionCount} version(s)</Badge>
                <span>{doc.uploadedByName}</span>
                <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </Card>
          </Link>
        );
        return (
          <li key={doc.id}>
            {moveFolders ? (
              <DocumentFilingRow
                documentId={doc.id}
                folderId={doc.folderId ?? null}
                folders={moveFolders}
                canCreateFolder={canCreateFolder}
              >
                {card}
              </DocumentFilingRow>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ul>
  );
}
