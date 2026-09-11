import Link from "next/link";
import { isSameMonth, isToday, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { dateKey } from "@/components/calendar/month-grid";
import type { PersonalPlanningEntryType } from "@/lib/personal-planning-types";

export type PersonalCalendarDayItems = {
  /** Tâches (échéance), lien vers /taches/[id]. */
  tasks: { id: string; titre: string }[];
  /** Activités personnelles + réunions fusionnées (§25), lien vers la tâche/réunion liée si elle existe. */
  activities: { id: string; titre: string; type: PersonalPlanningEntryType; href?: string }[];
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Calendrier mensuel personnel (demande utilisateur 2026-09-11) — même
 * structure/ergonomie que le composant MonthGrid de /calendrier (grille +
 * clic sur un jour pour le détail), mais uniquement tâches/activités
 * personnelles, sans congés ni événements organisationnels (hors de propos
 * pour ce module).
 */
export function PersonalMonthGrid({
  days,
  currentMonth,
  selectedDateKey,
  itemsByDate,
  dayHref,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDateKey?: string;
  itemsByDate: Map<string, PersonalCalendarDayItems>;
  dayHref: (key: string) => string;
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
          const key = dateKey(day);
          const items = itemsByDate.get(key);
          const inMonth = isSameMonth(day, currentMonth);
          const total = (items?.tasks.length ?? 0) + (items?.activities.length ?? 0);

          return (
            <Link
              key={key}
              href={dayHref(key)}
              className={cn(
                "flex min-h-24 min-w-0 flex-col gap-1 border-b border-r p-1.5 text-left align-top hover:bg-muted/50",
                !inMonth && "bg-muted/20 text-muted-foreground",
                selectedDateKey === key && "ring-2 ring-primary ring-inset"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday(day) && "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d", { locale: fr })}
              </span>
              <div className="flex flex-col gap-0.5">
                {items?.tasks.slice(0, 2).map((t) => (
                  <span key={t.id} className="truncate rounded bg-blue-500/10 px-1 text-[10px] text-blue-700 dark:text-blue-300">
                    {t.titre}
                  </span>
                ))}
                {items?.activities.slice(0, 2).map((a) => (
                  <span key={a.id} className="truncate rounded bg-purple-500/10 px-1 text-[10px] text-purple-700 dark:text-purple-300">
                    {a.titre}
                  </span>
                ))}
                {total > 4 && <span className="text-[10px] text-muted-foreground">+{total - 4} autres</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
