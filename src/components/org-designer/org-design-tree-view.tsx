import type { OrgDesignNode } from "@/lib/org-designer";
import { Badge } from "@/components/ui/badge";
import { Users2 } from "lucide-react";

export function OrgDesignTreeView({ node, depth = 0 }: { node: OrgDesignNode; depth?: number }) {
  return (
    <div style={{ marginLeft: depth * 20 }} className="space-y-2 border-l pl-3">
      <p className="font-medium">{node.nom}</p>
      {node.equipes.map((equipe, i) => (
        <div key={i} className="ml-2 space-y-1 rounded-md bg-muted/40 p-2 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <Users2 className="h-3.5 w-3.5" /> {equipe.nom}
            {equipe.responsableId && <Badge variant="outline">Responsable défini</Badge>}
          </p>
          {equipe.competences.length > 0 && (
            <p className="text-xs text-muted-foreground">Compétences : {equipe.competences.join(", ")}</p>
          )}
          {equipe.projets.length > 0 && (
            <p className="text-xs text-muted-foreground">Projets : {equipe.projets.join(", ")}</p>
          )}
          {equipe.processus.length > 0 && (
            <p className="text-xs text-muted-foreground">Processus : {equipe.processus.join(", ")}</p>
          )}
        </div>
      ))}
      {node.enfants.map((enfant, i) => (
        <OrgDesignTreeView key={i} node={enfant} depth={depth + 1} />
      ))}
    </div>
  );
}
