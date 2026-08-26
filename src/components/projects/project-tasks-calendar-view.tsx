"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GanttTaskRow } from "@/components/tasks/task-gantt-view";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Vue Calendrier des tâches du projet (cahier des charges Project Studio §41) — échéances du mois, navigation mois par mois. */
export function ProjectTasksCalendarView({ tasks }: { tasks: GanttTaskRow[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const byDate = new Map<string, GanttTaskRow[]>();
  for (const task of tasks) {
    if (!task.echeance) continue;
    const key = format(new Date(task.echeance), "yyyy-MM-dd");
    const list = byDate.get(key) ?? [];
    list.push(task);
    byDate.set(key, list);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
          ← Précédent
        </Button>
        <span className="text-sm font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</span>
        <Button variant="outline" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
          Suivant →
        </Button>
      </div>
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
            const items = byDate.get(key) ?? [];
            const inMonth = isSameMonth(day, month);

            return (
              <div
                key={key}
                className={cn(
                  "flex min-h-24 min-w-0 flex-col gap-1 border-b border-r p-1.5",
                  !inMonth && "bg-muted/20 text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday(day) && "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-0.5">
                  {items.slice(0, 3).map((task) => (
                    <Link
                      key={task.id}
                      href={`/taches/${task.id}`}
                      className="truncate rounded bg-blue-500/10 px-1 text-[10px] text-blue-700 hover:underline dark:text-blue-300"
                    >
                      {task.titre}
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{items.length - 3} autres</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
