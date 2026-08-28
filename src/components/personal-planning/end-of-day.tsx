import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ENTRY_MOTIF_BLOCAGE_LABELS } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { Moon } from "lucide-react";

/** §22 — Revue de fin de journée : bilan des activités du jour par statut. */
export function PersonalPlanningEndOfDay({
  entries,
  reporteesCount = 0,
}: {
  entries: PersonalPlanningEntryRow[];
  /** §22/§47 — entrées déplacées hors d'aujourd'hui pendant la journée (voir logAudit "personal_planning_entry.moved"). */
  reporteesCount?: number;
}) {
  const real = entries.filter((e) => e.type !== "RESERVE" && !e.meetingHref);
  const terminees = real.filter((e) => e.statut === "TERMINEE");
  const bloquees = real.filter((e) => e.statut === "BLOQUEE");
  const enRetard = real.filter((e) => new Date(e.dateFin) < new Date() && !["TERMINEE", "ANNULEE"].includes(e.statut));
  const annulees = real.filter((e) => e.statut === "ANNULEE");

  if (real.length === 0 && reporteesCount === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Moon className="size-5 text-primary" />
        <CardTitle className="text-base">Bilan de ma journée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Prévues" value={real.length} />
          <Stat label="Terminées" value={terminees.length} tone="text-success" />
          <Stat label="Reportée(s)" value={reporteesCount} tone={reporteesCount > 0 ? "text-warning" : undefined} />
          <Stat label="En retard" value={enRetard.length} tone="text-destructive" />
          <Stat label="Bloquées" value={bloquees.length} tone="text-warning" />
        </div>

        {bloquees.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">Activités bloquées</h3>
            <ul className="space-y-1">
              {bloquees.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
                  <span className="truncate">{e.titre}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {e.motifBlocage ? ENTRY_MOTIF_BLOCAGE_LABELS[e.motifBlocage] : "Motif non renseigné"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {annulees.length > 0 && (
          <p className="text-xs text-muted-foreground">{annulees.length} activité(s) annulée(s) aujourd&apos;hui.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
