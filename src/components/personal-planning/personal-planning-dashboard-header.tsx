import { Card, CardContent } from "@/components/ui/card";

export type PersonalPlanningDashboardStats = {
  aujourdHui: number;
  enRetard: number;
  aVenir: number;
  reunions: number;
  chargePercent: number;
};

/**
 * §5 « Tableau de bord "Mon Planning" » : en-tête personnalisé + 5
 * indicateurs (Aujourd'hui/En retard/À venir/Réunions/Charge), en haut de
 * la page principale — distinct du bloc "Ma journée" (§6, groupé par
 * priorité, plus bas sur la page).
 */
export function PersonalPlanningDashboardHeader({
  userName,
  today,
  stats,
}: {
  userName: string;
  today: Date;
  stats: PersonalPlanningDashboardStats;
}) {
  const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div>
          <p className="text-lg font-semibold">Bonjour {userName} 👋</p>
          <p className="text-sm capitalize text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Aujourd'hui" value={stats.aujourdHui} />
          <Stat label="En retard" value={stats.enRetard} tone={stats.enRetard > 0 ? "text-destructive" : undefined} />
          <Stat label="À venir" value={stats.aVenir} />
          <Stat label="Réunions" value={stats.reunions} />
          <Stat label="Charge" value={`${stats.chargePercent} %`} tone={stats.chargePercent > 100 ? "text-destructive" : undefined} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className={`text-xl font-semibold ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
