import { formatHours, type DailyCharge } from "@/lib/personal-planning-workload";
import { cn } from "@/lib/utils";

/**
 * Barre de synthèse "Capacité du jour" au-dessus du calendrier (cahier de
 * corrections UI/UX §19/§20) — même donnée que la carte "Charge du jour" de
 * la colonne de droite, affichée en plus ici en une ligne compacte, juste
 * au-dessus de la grille, comme dans le schéma recommandé du cahier.
 */
export function PersonalPlanningCapacityBar({ charge }: { charge: DailyCharge }) {
  const disponible = Math.max(0, charge.capaciteHeures - charge.chargeHeures);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/20 px-3 py-2 text-xs">
      <span className="font-medium">Capacité du jour</span>
      <span className="text-muted-foreground">{formatHours(charge.capaciteHeures)} disponibles</span>
      <span className="text-muted-foreground">Planifié : {formatHours(charge.chargeHeures)}</span>
      <span className={charge.enSurcharge ? "font-medium text-destructive" : "text-muted-foreground"}>
        {charge.enSurcharge ? `+${formatHours(charge.heuresSupplementaires)} de surcharge` : `Disponible : ${formatHours(disponible)}`}
      </span>
      <div className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", charge.enSurcharge ? "bg-destructive" : "bg-success")}
          style={{ width: `${Math.min(100, charge.tauxOccupation)}%` }}
        />
      </div>
      <span className={cn("font-semibold", charge.enSurcharge ? "text-destructive" : "text-success")}>
        {charge.enSurcharge ? `🔴 ${charge.tauxOccupation}%` : `✓ ${charge.tauxOccupation}% — Charge normale`}
      </span>
    </div>
  );
}
