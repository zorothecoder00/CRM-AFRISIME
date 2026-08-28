import Link from "next/link";
import { isSameMonth, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { ENTRY_PRIORITE_META } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE_PER_DAY = 3;

/** Vue Mois (§8) : grille mensuelle dédiée aux activités personnelles (composant propre, distinct de /calendrier). */
export function PersonalPlanningMonth({
  days,
  currentMonth,
  entriesByDate,
}: {
  days: Date[];
  currentMonth: Date;
  entriesByDate: Map<string, PersonalPlanningEntryRow[]>;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const entries = entriesByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <Link
              key={key}
              href={`/planning-personnel?vue=jour&semaine=${key}`}
              className={cn(
                "min-h-24 border-b border-r p-1.5 text-left align-top text-xs transition-colors hover:bg-muted/40",
                !inMonth && "bg-muted/20 text-muted-foreground",
                today && "bg-primary/5 ring-1 ring-inset ring-primary/40"
              )}
            >
              <div className={cn("mb-1 font-medium", today && "text-primary")}>{format(day, "d")}</div>
              <div className="space-y-0.5">
                {entries.slice(0, MAX_VISIBLE_PER_DAY).map((e) => (
                  <div key={e.id} className="truncate rounded bg-muted px-1 py-0.5">
                    {ENTRY_PRIORITE_META[e.priorite].emoji} {e.titre}
                  </div>
                ))}
                {entries.length > MAX_VISIBLE_PER_DAY && (
                  <div className="text-[10px] text-muted-foreground">+{entries.length - MAX_VISIBLE_PER_DAY} autres</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
