import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { CapacityFormDialog } from "@/components/workload/capacity-form-dialog";
import type { UserWorkload } from "@/lib/workload";
import { AlertTriangle } from "lucide-react";

export function WorkloadTable({
  rows,
  canManage,
}: {
  rows: UserWorkload[];
  canManage: boolean;
}) {
  const overloaded = rows.filter((r) => r.enSurcharge);

  return (
    <div className="space-y-4">
      {overloaded.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{overloaded.length} collaborateur(s) en surcharge</strong> :{" "}
            {overloaded.map((r) => r.name).join(", ")}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collaborateur</TableHead>
              <TableHead>Tâches actives</TableHead>
              <TableHead>Charge / Capacité</TableHead>
              <TableHead>Heures consommées</TableHead>
              <TableHead>Taux d&apos;occupation</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead>Temps moyen de réalisation</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.roleLabel}</div>
                </TableCell>
                <TableCell>{row.tacheCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {row.chargeHeures}h / {row.capaciteHeures}h
                    </span>
                    {canManage && (
                      <CapacityFormDialog userId={row.userId} currentCapacity={row.capaciteHeures} />
                    )}
                  </div>
                </TableCell>
                <TableCell>{row.heuresConsommeesTotal}h</TableCell>
                <TableCell className="min-w-32">
                  <ProgressBar value={row.tauxOccupation} />
                  <span className="text-xs text-muted-foreground">{row.tauxOccupation}%</span>
                </TableCell>
                <TableCell>{row.disponibiliteHeures}h</TableCell>
                <TableCell>
                  {row.tempsMoyenRealisationHeures !== null
                    ? `${row.tempsMoyenRealisationHeures}h`
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {row.statut === "SURCHARGE" && <Badge variant="destructive">Surcharge</Badge>}
                    {row.statut === "SOUS_CHARGE" && <Badge variant="outline">Sous-charge</Badge>}
                    {row.statut === "CHARGE_NORMALE" && <Badge variant="secondary">Charge normale</Badge>}
                    {row.enCongeAujourdhui && <Badge variant="outline">En congé</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
