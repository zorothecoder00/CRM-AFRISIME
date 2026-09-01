import Link from "next/link";
import { cn } from "@/lib/utils";
import { CalendarCheck, Clock, CalendarClock, Users, Gauge, HeartPulse, type LucideIcon } from "lucide-react";

export type PersonalPlanningStatsData = {
  tachesJour: number;
  tachesJourPlanifiees: number;
  enRetard: number;
  aVenir: number;
  reunions: number;
  chargePercent: number;
  planningHealth: number;
};

/**
 * Rangée de 6 indicateurs en haut du hub (refonte design) : reprend les
 * mêmes chiffres que l'ancien PersonalPlanningDashboardHeader (§5) en y
 * ajoutant le Planning Health (§43), qui n'apparaissait auparavant que plus
 * bas sous forme de badge.
 */
export function PersonalPlanningStats({ stats }: { stats: PersonalPlanningStatsData }) {
  const healthTone = stats.planningHealth >= 80 ? "good" : stats.planningHealth >= 50 ? "warn" : "bad";
  const healthLabel = healthTone === "good" ? "Bon niveau" : healthTone === "warn" ? "Niveau correct" : "À surveiller";
  const chargeTone = stats.chargePercent > 100 ? "bad" : stats.chargePercent >= 80 ? "warn" : "good";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile
        icon={CalendarCheck}
        tone="brand"
        label="Mes tâches (jour)"
        value={stats.tachesJour}
        sublabel={`${stats.tachesJourPlanifiees} planifiée(s)`}
        href="/planning-personnel?vue=jour"
      />
      <StatTile
        icon={Clock}
        tone={stats.enRetard > 0 ? "bad" : "good"}
        label="En retard"
        value={stats.enRetard}
        sublabel="Toutes échéances"
        href="/planning-personnel?vue=liste&enRetard=1"
      />
      <StatTile
        icon={CalendarClock}
        tone="brand"
        label="À venir"
        value={stats.aVenir}
        sublabel="Activités planifiées"
        href="/planning-personnel?vue=liste&aVenir=1"
      />
      <StatTile
        icon={Users}
        tone="brand"
        label="Réunions"
        value={stats.reunions}
        sublabel="Aujourd'hui"
        href="/planning-personnel?vue=jour&type=REUNION"
      />
      <StatTile
        icon={Gauge}
        tone={chargeTone}
        label="Charge de travail"
        value={`${stats.chargePercent}%`}
        sublabel={stats.chargePercent > 100 ? "Surcharge" : "Aujourd'hui"}
        href="/ma-journee"
      />
      <StatTile
        icon={HeartPulse}
        tone={healthTone}
        label="Planning Health"
        value={`${stats.planningHealth}/100`}
        sublabel={healthLabel}
        href="/planning-personnel#planning-health"
      />
    </div>
  );
}

const TONE_CLASSES: Record<"brand" | "good" | "warn" | "bad", string> = {
  brand: "bg-primary/10 text-primary",
  good: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  bad: "bg-destructive/10 text-destructive",
};

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  sublabel,
  href,
}: {
  icon: LucideIcon;
  tone: "brand" | "good" | "warn" | "bad";
  label: string;
  value: string | number;
  sublabel: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md border p-2 transition-colors hover:bg-muted/40">
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold leading-tight">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-[10px] leading-tight text-muted-foreground/70">{sublabel}</div>
      </div>
    </Link>
  );
}
