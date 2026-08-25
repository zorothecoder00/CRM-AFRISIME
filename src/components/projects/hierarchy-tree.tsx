import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { SectionFormDialog } from "@/components/projects/section-form-dialog";
import { SectionConversionButtons } from "@/components/projects/section-conversion-buttons";

export type SectionNode = {
  id: string;
  nom: string;
  type: "PHASE" | "SOUS_PHASE" | "LOT";
  statut: string;
  responsableName: string | null;
  taskCount: number;
  children: SectionNode[];
};

const TYPE_LABELS: Record<string, string> = {
  PHASE: "Phase",
  SOUS_PHASE: "Sous-phase",
  LOT: "Lot",
};

const STATUS_LABELS: Record<string, string> = {
  A_VENIR: "À venir",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  EN_RETARD: "En retard",
};

type Option = { id: string; label: string };

export function HierarchyTree({
  nodes,
  projectId,
  users,
  depth = 0,
}: {
  nodes: SectionNode[];
  projectId: string;
  users: Option[];
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          Aucune phase définie pour ce projet.
        </p>
        <SectionFormDialog projectId={projectId} users={users} triggerLabel="Ajouter une phase" />
      </div>
    );
  }

  return (
    <ul className="space-y-2" style={{ marginLeft: depth > 0 ? "1.25rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{TYPE_LABELS[node.type]}</Badge>
              <Link
                href={`/projets/${projectId}/sections/${node.id}`}
                className="font-medium hover:underline"
              >
                {node.nom}
              </Link>
              <Badge variant={toneForStatus(node.statut)}>{STATUS_LABELS[node.statut]}</Badge>
              {node.responsableName && (
                <span className="text-xs text-muted-foreground">
                  Responsable : {node.responsableName}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {node.taskCount} tâche(s)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <SectionConversionButtons sectionId={node.id} />
              <SectionFormDialog
                projectId={projectId}
                parentId={node.id}
                users={users}
                triggerLabel="Ajouter un enfant"
              />
            </div>
          </div>
          {node.children.length > 0 && (
            <div className="mt-2">
              <HierarchyTree nodes={node.children} projectId={projectId} users={users} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
