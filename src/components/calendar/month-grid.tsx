import Link from "next/link";
import { isSameMonth, isToday, format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarDayItems = {
  tasks: { id: string; titre: string }[];
  meetings: { id: string; titre: string }[];
  leaves: { id: string; userName: string }[];
  events: { id: string; titre: string }[];
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function MonthGrid({
  days,
  currentMonth,
  selectedDateKey,
  itemsByDate,
  dayHref,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDateKey?: string;
  itemsByDate: Map<string, CalendarDayItems>;
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
          const total =
            (items?.tasks.length ?? 0) +
            (items?.meetings.length ?? 0) +
            (items?.leaves.length ?? 0) +
            (items?.events.length ?? 0);

          return (
            <Link
              key={key}
              href={dayHref(key)}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-r p-1.5 text-left align-top hover:bg-muted/50",
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
                {items?.meetings.slice(0, 2).map((m) => (
                  <span key={m.id} className="truncate rounded bg-purple-500/10 px-1 text-[10px] text-purple-700 dark:text-purple-300">
                    {m.titre}
                  </span>
                ))}
                {items?.leaves.slice(0, 1).map((l) => (
                  <span key={l.id} className="truncate rounded bg-amber-500/10 px-1 text-[10px] text-amber-700 dark:text-amber-300">
                    Congé · {l.userName}
                  </span>
                ))}
                {items?.events.slice(0, 1).map((e) => (
                  <span key={e.id} className="truncate rounded bg-emerald-500/10 px-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                    {e.titre}
                  </span>
                ))}
                {total > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{total - 4} autres</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
