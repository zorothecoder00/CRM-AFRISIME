import Link from "next/link";
import { isSameMonth, isToday, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type ProjectCalendarDayItems = {
  projects: { id: string; nom: string }[];
  milestones: { id: string; nom: string; projectId: string; projectNom: string }[];
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Vue Calendrier au niveau projet (cahier des charges §VI) — distincte du calendrier personnel /calendrier : ici, planning de tous les projets (dateDebut-dateFin) plutot que l'agenda d'un utilisateur. */
export function ProjectMonthGrid({
  days,
  currentMonth,
  selectedDateKey,
  itemsByDate,
  dayHref,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDateKey?: string;
  itemsByDate: Map<string, ProjectCalendarDayItems>;
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
          const total = (items?.projects.length ?? 0) + (items?.milestones.length ?? 0);

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
                {items?.projects.slice(0, 2).map((p) => (
                  <span key={p.id} className="truncate rounded bg-blue-500/10 px-1 text-[10px] text-blue-700 dark:text-blue-300">
                    {p.nom}
                  </span>
                ))}
                {items?.milestones.slice(0, 2).map((m) => (
                  <span key={m.id} className="truncate rounded bg-emerald-500/10 px-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                    ◆ {m.nom}
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
