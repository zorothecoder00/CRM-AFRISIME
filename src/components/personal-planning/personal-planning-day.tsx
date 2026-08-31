"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import { EntryBlock } from "@/components/personal-planning/entry-block";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { detectTightTransition } from "@/lib/personal-planning-workload";
import { cn } from "@/lib/utils";
import { GRID_START_HOUR, GRID_END_HOUR, HOUR_HEIGHT_PX, gridHours, gridStartOf, offsetPx, dateKeyOf, computeGridBounds, clippedEntryRange } from "@/lib/personal-planning-grid";

function HourSlot({ dayKey, hour, top }: { dayKey: string; hour: number; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${dayKey}-${hour}`, data: { date: dayKey, hour } });
  return (
    <div
      ref={setNodeRef}
      className={cn("absolute inset-x-0", isOver && "bg-primary/10")}
      style={{ top, height: HOUR_HEIGHT_PX }}
    />
  );
}

/** Time Blocking (§7) : grille horaire d'une journée, activités positionnées par plage horaire réservée. Créneaux droppables pour §13/§14. */
export function PersonalPlanningDay({
  day,
  entries,
  refData,
  holidayName,
}: {
  day: Date;
  entries: PersonalPlanningEntryRow[];
  refData: PersonalPlanningReferenceData;
  /** §39 — nom du jour férié si `day` en est un, null/absent sinon. */
  holidayName?: string | null;
}) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);
  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" ? { ...editing, type: editing.type } : null;
  const bounds = computeGridBounds(entries, day);
  const hours = gridHours(bounds.startHour, bounds.endHour);
  const dayKey = dateKeyOf(day);
  const gridStart = gridStartOf(day, bounds.startHour);

  const sorted = [...entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  return (
    <div className="space-y-2">
      {holidayName && (
        <div className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive">
          🎉 Jour férié : {holidayName}
        </div>
      )}
      <div className="relative rounded-md border" style={{ height: hours.length * HOUR_HEIGHT_PX }}>
      {hours.map((h, i) => (
        <div
          key={h}
          className="absolute inset-x-0 flex items-start border-t text-[10px] text-muted-foreground"
          style={{ top: i * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
        >
          <span className="ml-1 -translate-y-1/2 bg-background px-1">{String(h).padStart(2, "0")}:00</span>
        </div>
      ))}

      <div className="absolute inset-0 ml-14">
        {hours.map((h, i) => (
          <HourSlot key={h} dayKey={dayKey} hour={h} top={i * HOUR_HEIGHT_PX} />
        ))}
        {sorted.map((entry, i) => {
          const range = clippedEntryRange(entry, day);
          const top = Math.max(0, offsetPx(range.start, gridStart));
          const height = Math.max(20, offsetPx(range.end, gridStart) - top);
          const next = sorted[i + 1];
          const tight = next ? detectTightTransition(entry, next) : false;
          return (
            <EntryBlock
              key={entry.id}
              entry={entry}
              top={top}
              height={height}
              onEdit={() => setEditing(entry)}
              tightTransition={tight}
              rangeStart={range.start}
              rangeEnd={range.end}
              clippedAtStart={range.clippedAtStart}
              clippedAtEnd={range.clippedAtEnd}
            />
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Badge variant="outline">Rien de prévu entre {GRID_START_HOUR}h et {GRID_END_HOUR}h</Badge>
        </div>
      )}

      {editData && (
        <PersonalPlanningEntryEditDialog entry={editData} open={!!editing} onOpenChange={(o) => setEditing(o ? editing : null)} refData={refData} />
      )}
      </div>
    </div>
  );
}
