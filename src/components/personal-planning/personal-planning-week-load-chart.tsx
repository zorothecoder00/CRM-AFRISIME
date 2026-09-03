import { cn } from "@/lib/utils";

export type WeekLoadDay = {
  label: string;
  dateLabel: string;
  tauxOccupation: number;
  chargeHeures: number;
  capaciteHeures: number;
  isToday: boolean;
};

const TONE_BAR_CLASSES = {
  // Bleu (pas rouge) même en surcharge — demande utilisateur, le rouge était
  // jugé trop alarmiste pour une simple analyse de charge.
  surcharge: "bg-info/70",
  warning: "bg-warning/70",
  success: "bg-success/70",
} as const;

function toneFor(tauxOccupation: number): keyof typeof TONE_BAR_CLASSES {
  if (tauxOccupation > 100) return "surcharge";
  if (tauxOccupation >= 80) return "warning";
  return "success";
}

/** Analyse de charge de la semaine (prototype V2, page "Calendrier") — barre par jour, % de la capacité occupé. */
export function PersonalPlanningWeekLoadChart({ days }: { days: WeekLoadDay[] }) {
  const max = Math.max(100, ...days.map((d) => d.tauxOccupation));

  return (
    <div className="flex items-end gap-3 px-1">
      {days.map((d) => (
        <div key={d.dateLabel} className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span className="text-xs font-semibold">{d.tauxOccupation}%</span>
          <div className="relative h-36 w-full">
            <div
              className={cn("absolute bottom-0 w-full rounded-t-md transition-all", TONE_BAR_CLASSES[toneFor(d.tauxOccupation)])}
              style={{ height: `${Math.max(2, (d.tauxOccupation / max) * 100)}%` }}
              title={`${d.chargeHeures}h / ${d.capaciteHeures}h`}
            />
          </div>
          <span className={cn("text-[11px] font-medium", d.isToday && "text-primary")}>{d.label}</span>
          <span className="text-[10px] text-muted-foreground">{d.dateLabel}</span>
        </div>
      ))}
    </div>
  );
}
