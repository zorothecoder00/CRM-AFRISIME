import { Badge } from "@/components/ui/badge";
import { EntityFormDialog } from "@/components/administration/entity-form-dialog";
import { entityLevelLabel } from "@/lib/entity-tree";

export type EntityTreeNode = {
  id: string;
  nom: string;
  code: string;
  parentId: string | null;
  pays: string | null;
  devise: string | null;
  fuseauHoraire: string | null;
  langue: string | null;
  reglementations: string | null;
  parametresLocaux: string | null;
  departmentCount: number;
  holidayCount: number;
  children: EntityTreeNode[];
};

type Option = { id: string; label: string };

export function EntityTree({
  nodes,
  parentOptions,
  depth = 0,
}: {
  nodes: EntityTreeNode[];
  /** Toutes les entités, en options indentées — pour les selects "parent" des dialogues. */
  parentOptions: Option[];
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">Aucune entité pour le moment.</p>
        <EntityFormDialog parentOptions={parentOptions} />
      </div>
    );
  }

  return (
    <ul className="space-y-2" style={{ marginLeft: depth > 0 ? "1.25rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{entityLevelLabel(depth)}</Badge>
              <Badge variant="secondary">{node.code}</Badge>
              <span className="font-medium">{node.nom}</span>
              {node.pays && <span className="text-xs text-muted-foreground">{node.pays}</span>}
              {node.devise && <span className="text-xs text-muted-foreground">· {node.devise}</span>}
              <span className="text-xs text-muted-foreground">
                {node.departmentCount} département(s) · {node.holidayCount} jour(s) férié(s)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <EntityFormDialog
                parentOptions={parentOptions}
                defaultParentId={node.id}
                triggerLabel="Ajouter une sous-entité"
              />
              <EntityFormDialog
                parentOptions={parentOptions}
                entity={{
                  id: node.id,
                  nom: node.nom,
                  code: node.code,
                  parentId: node.parentId,
                  pays: node.pays,
                  devise: node.devise,
                  fuseauHoraire: node.fuseauHoraire,
                  langue: node.langue,
                  reglementations: node.reglementations,
                  parametresLocaux: node.parametresLocaux,
                }}
              />
            </div>
          </div>
          {node.children.length > 0 && (
            <div className="mt-2">
              <EntityTree nodes={node.children} parentOptions={parentOptions} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
