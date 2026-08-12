import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";

export type PlanNode = {
  id: string;
  nom: string;
  niveau: string;
  statut: string;
  departmentName: string | null;
  ownerName: string;
  dateDebut: string;
  dateFin: string;
  children: PlanNode[];
};

const NIVEAU_LABELS: Record<string, string> = {
  STRATEGIQUE: "Stratégique",
  ANNUEL: "Annuel",
  TRIMESTRIEL: "Trimestriel",
  MENSUEL: "Mensuel",
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export function PlanTree({ nodes, depth = 0 }: { nodes: PlanNode[]; depth?: number }) {
  if (nodes.length === 0 && depth === 0) {
    return <p className="text-sm text-muted-foreground">Aucun plan pour le moment.</p>;
  }

  return (
    <ul className="space-y-2" style={{ marginLeft: depth > 0 ? "1.25rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id} className="rounded-md border p-3">
          <Link href={`/planification/${node.id}`} className="flex flex-wrap items-center gap-2 hover:underline">
            <Badge variant="outline">{NIVEAU_LABELS[node.niveau]}</Badge>
            <span className="font-medium">{node.nom}</span>
            <Badge variant={toneForStatus(node.statut)}>{STATUS_LABELS[node.statut]}</Badge>
            {node.departmentName && (
              <span className="text-xs text-muted-foreground">{node.departmentName}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(node.dateDebut).toLocaleDateString("fr-FR")} →{" "}
              {new Date(node.dateFin).toLocaleDateString("fr-FR")}
            </span>
          </Link>
          {node.children.length > 0 && (
            <div className="mt-2">
              <PlanTree nodes={node.children} depth={depth + 1} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
