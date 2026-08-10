import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li key={doc.id}>
          <Link
            href={`/documents/${doc.id}`}
            className="flex flex-col gap-1 rounded-md border p-3 text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{doc.nom}</div>
                {doc.projectNom && (
                  <div className="text-xs text-muted-foreground">{doc.projectNom}</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {doc.taskId && <Badge variant="outline">Tâche : {doc.taskTitre}</Badge>}
              {doc.meetingId && <Badge variant="outline">Réunion : {doc.meetingTitre}</Badge>}
              <Badge variant="secondary">{doc.versionCount} version(s)</Badge>
              <span>{doc.uploadedByName}</span>
              <span>{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
