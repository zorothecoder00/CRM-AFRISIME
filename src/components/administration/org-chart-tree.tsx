import { Badge } from "@/components/ui/badge";

export type OrgChartNodeData = {
  id: string;
  label: string;
  sublabel?: string | null;
  badge?: string | null;
  children: OrgChartNodeData[];
};

function NodeCard({ node }: { node: OrgChartNodeData }) {
  return (
    <div className="flex min-w-[140px] max-w-[180px] flex-col items-center gap-0.5 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
      <span className="truncate text-sm font-medium">{node.label}</span>
      {node.sublabel && <span className="truncate text-xs text-muted-foreground">{node.sublabel}</span>}
      {node.badge && (
        <Badge variant="secondary" className="mt-0.5 text-[10px]">
          {node.badge}
        </Badge>
      )}
    </div>
  );
}

/**
 * Organigramme graphique (cahier des charges §I) — rendu en boîtes reliées
 * par des connecteurs, plutôt qu'une simple liste indentée (DepartmentTree
 * reste la vue de gestion ; ceci est la vue de consultation visuelle).
 * Connecteurs en divs positionnés (pas de SVG a la main) : un trait vertical
 * sous le noeud, puis une barre horizontale par enfant (segment demi-largeur
 * pour le premier/dernier, pleine largeur pour les enfants intermediaires)
 * qui bout a bout forme la ligne continue au-dessus de la fratrie.
 */
export function OrgChartNode({ node }: { node: OrgChartNodeData }) {
  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} />
      {node.children.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-start">
            {node.children.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center px-3">
                <div
                  className="absolute top-0 h-px bg-border"
                  style={{
                    left: i === 0 ? "50%" : 0,
                    right: i === node.children.length - 1 ? "50%" : 0,
                  }}
                />
                <div className="h-4 w-px bg-border" />
                <OrgChartNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgChart({ roots }: { roots: OrgChartNodeData[] }) {
  if (roots.length === 0) {
    return <p className="text-sm text-muted-foreground">Rien à afficher.</p>;
  }
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-start justify-center gap-8 px-4 pt-2">
        {roots.map((root) => (
          <OrgChartNode key={root.id} node={root} />
        ))}
      </div>
    </div>
  );
}
