import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FolderFormDialog } from "@/components/documents/folder-form-dialog";
import { Folder } from "lucide-react";

export type FolderNode = {
  id: string;
  nom: string;
  documentCount: number;
  children: FolderNode[];
};

export function FolderTree({
  nodes,
  projectId,
  activeFolderId,
  buildHref,
  depth = 0,
}: {
  nodes: FolderNode[];
  projectId: string;
  activeFolderId?: string;
  buildHref: (folderId: string | undefined) => string;
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-3">
        <p className="text-sm text-muted-foreground">Aucun dossier pour ce projet.</p>
        <FolderFormDialog projectId={projectId} triggerLabel="Créer un dossier" />
      </div>
    );
  }

  return (
    <ul className="space-y-1" style={{ marginLeft: depth > 0 ? "1rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1">
            <Link
              href={buildHref(node.id)}
              className={`flex items-center gap-2 text-sm ${
                activeFolderId === node.id ? "font-semibold" : "hover:underline"
              }`}
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              {node.nom}
              <Badge variant="outline" className="text-xs">
                {node.documentCount}
              </Badge>
            </Link>
            <FolderFormDialog
              projectId={projectId}
              parentId={node.id}
              triggerLabel="Sous-dossier"
              variant="outline"
            />
          </div>
          {node.children.length > 0 && (
            <FolderTree
              nodes={node.children}
              projectId={projectId}
              activeFolderId={activeFolderId}
              buildHref={buildHref}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
