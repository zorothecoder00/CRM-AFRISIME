import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock3 } from "lucide-react";
import { formatHours, type DailyCharge } from "@/lib/personal-planning-workload";

/** Widget "Charge du jour" du hub — reprend le même calcul que le bandeau de surcharge (§15). */
export function PersonalPlanningDailyLoadCard({ charge }: { charge: DailyCharge }) {
  const disponible = Math.max(0, charge.capaciteHeures - charge.chargeHeures);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-primary" />
          <CardTitle className="text-base">Charge du jour</CardTitle>
        </div>
        <span className={`text-sm font-semibold ${charge.enSurcharge ? "text-destructive" : "text-muted-foreground"}`}>
          {charge.tauxOccupation}%
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg font-semibold">
          {formatHours(charge.chargeHeures)} / {formatHours(charge.capaciteHeures)}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${charge.enSurcharge ? "bg-destructive" : "bg-success"}`}
            style={{ width: `${Math.min(100, charge.tauxOccupation)}%` }}
          />
        </div>
        {charge.enSurcharge ? (
          <p className="text-xs text-destructive">+{formatHours(charge.heuresSupplementaires)} de surcharge</p>
        ) : (
          <p className="text-xs text-muted-foreground">Disponible : {formatHours(disponible)}</p>
        )}
        <Link href="/ma-journee" className="inline-block text-xs text-primary hover:underline">
          Détails →
        </Link>
      </CardContent>
    </Card>
  );
}
