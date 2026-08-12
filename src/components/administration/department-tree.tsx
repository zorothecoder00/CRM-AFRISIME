import { Badge } from "@/components/ui/badge";
import { DepartmentFormDialog } from "@/components/administration/department-form-dialog";

export type DepartmentNode = {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  userCount: number;
  children: DepartmentNode[];
};

type Option = { id: string; label: string };

export function DepartmentTree({
  nodes,
  parentOptions,
  depth = 0,
}: {
  nodes: DepartmentNode[];
  /** Tous les departements, en options indentees — pour les selects "parent" des dialogues. */
  parentOptions: Option[];
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">Aucun département pour le moment.</p>
        <DepartmentFormDialog parentOptions={parentOptions} />
      </div>
    );
  }

  return (
    <ul className="space-y-2" style={{ marginLeft: depth > 0 ? "1.25rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{node.code}</Badge>
              <span className="font-medium">{node.name}</span>
              <span className="text-xs text-muted-foreground">
                {node.userCount} collaborateur(s)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DepartmentFormDialog
                parentOptions={parentOptions}
                defaultParentId={node.id}
                triggerLabel="Ajouter un sous-département"
              />
              <DepartmentFormDialog
                parentOptions={parentOptions}
                department={{ id: node.id, name: node.name, code: node.code, parentId: node.parentId }}
              />
            </div>
          </div>
          {node.children.length > 0 && (
            <div className="mt-2">
              <DepartmentTree nodes={node.children} parentOptions={parentOptions} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
