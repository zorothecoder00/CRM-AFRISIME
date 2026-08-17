import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BenchmarkColumn } from "@/lib/benchmarking";

/** V2.2 §25 — tableau générique Indicateur | Colonne 1 | Colonne 2 | ..., mirroir de ScenarioComparisonTable. */
export function BenchmarkComparisonTable({ columns }: { columns: BenchmarkColumn[] }) {
  if (columns.length === 0) {
    return <p className="text-sm text-muted-foreground">Choisissez au moins deux éléments à comparer.</p>;
  }

  const rowLabels = columns[0].rows.map((r) => r.label);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Indicateur</TableHead>
            {columns.map((c) => (
              <TableHead key={c.label}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowLabels.map((label, i) => (
            <TableRow key={label}>
              <TableCell className="font-medium">{label}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.rows[i]?.value ?? "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
