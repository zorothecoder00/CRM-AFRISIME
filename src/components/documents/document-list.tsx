import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, type CardAccent } from "@/components/ui/card";
import { FileText } from "lucide-react";

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
};

// Un document rattache a une tache ou une reunion est colore en consequence
// (info/primary) ; un document a la racine du projet reste neutre. Donne un
// repere visuel immediat sur la provenance du document dans une longue liste.
function accentForDocument(doc: DocumentRow): CardAccent {
  if (doc.taskId) return "info";
  if (doc.meetingId) return "primary";
  return "none";
}

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li key={doc.id}>
          <Link href={`/documents/${doc.id}`}>
            <Card
              accent={accentForDocument(doc)}
              size="sm"
              className="flex-row flex-wrap items-center justify-between gap-2 transition-all hover:-translate-y-0.5 hover:bg-muted/50 sm:flex-nowrap"
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
                {doc.taskId && <Badge variant="outline">Tâche : {doc.taskTitre}</Badge>}
                {doc.meetingId && <Badge variant="outline">Réunion : {doc.meetingTitre}</Badge>}
                <Badge variant="secondary">{doc.versionCount} version(s)</Badge>
                <span>{doc.uploadedByName}</span>
                <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
