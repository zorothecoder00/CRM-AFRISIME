import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toneForStatus } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import type { ControlTowerRow, RagStatus } from "@/lib/control-tower";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const RAG_COLOR: Record<RagStatus, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-destructive",
  gray: "bg-muted-foreground/30",
};

const RAG_LABEL: Record<RagStatus, string> = {
  green: "OK",
  amber: "À surveiller",
  red: "Alerte",
  gray: "Pas de donnée",
};

const DIMENSIONS: { key: keyof Pick<ControlTowerRow, "planning" | "budget" | "risques" | "qualite" | "livrables" | "impact">; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "budget", label: "Budget" },
  { key: "risques", label: "Risques" },
  { key: "qualite", label: "Qualité" },
  { key: "livrables", label: "Livrables" },
  { key: "impact", label: "Impact" },
];

function RagDot({ status, dimension }: { status: RagStatus; dimension: string }) {
  return (
    <span
      title={`${dimension} : ${RAG_LABEL[status]}`}
      className={cn("inline-block h-3 w-3 rounded-full", RAG_COLOR[status])}
    />
  );
}

/** Project Control Tower (cahier des charges Project Studio §42) — tableau de bord central multi-projets. */
export function ControlTowerView({ rows }: { rows: ControlTowerRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun projet pour le moment.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Projet</TableHead>
            <TableHead>Avancement</TableHead>
            {DIMENSIONS.map((d) => (
              <TableHead key={d.key} className="text-center">
                {d.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={`/projets/${row.id}`} className="font-medium hover:underline">
                  {row.nom}
                </Link>
                <div className="mt-0.5">
                  <Badge variant={toneForStatus(row.statut)}>{STATUS_LABELS[row.statut]}</Badge>
                </div>
              </TableCell>
              <TableCell>{row.avancement}%</TableCell>
              {DIMENSIONS.map((d) => (
                <TableCell key={d.key} className="text-center">
                  <RagDot status={row[d.key]} dimension={d.label} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
