"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import { EntryBlock } from "@/components/personal-planning/entry-block";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { detectTightTransition } from "@/lib/personal-planning-workload";
import { cn } from "@/lib/utils";
import type { PersonalPlanningEntryType } from "@/lib/personal-planning-types";
import { GRID_START_HOUR, GRID_END_HOUR, HOUR_HEIGHT_PX, gridHours, gridStartOf, offsetPx } from "@/lib/personal-planning-grid";

export type PersonalPlanningEntryRow = Omit<PersonalPlanningEntryEditData, "type"> & {
  type: PersonalPlanningEntryType;
  /** §25 — Meeting existant fusionné en lecture seule dans les vues du planning personnel (non éditable ici, voir /reunions/[id]). */
  meetingHref?: string;
  /** §34 — titre de la première dépendance non résolue de la Tâche liée (TaskDependency déjà existant), null si aucune. */
  blockedByTitre?: string | null;
};

export type PersonalPlanningDay = {
  key: string;
  /** yyyy-MM-dd — utilisé comme cible de drop (§14), distinct de `key` (React key). */
  dateKey: string;
  label: string;
  isToday: boolean;
  entries: PersonalPlanningEntryRow[];
};

function HourSlot({ dateKey, hour, top }: { dateKey: string; hour: number; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${dateKey}-${hour}`, data: { date: dateKey, hour } });
  return <div ref={setNodeRef} className={cn("absolute inset-x-0", isOver && "bg-primary/10")} style={{ top, height: HOUR_HEIGHT_PX }} />;
}

function DayColumn({ day, onEdit }: { day: PersonalPlanningDay; onEdit: (entry: PersonalPlanningEntryRow) => void }) {
  const hours = gridHours();
  const gridStart = gridStartOf(new Date(day.dateKey));
  const sorted = [...day.entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  return (
    <div className={cn("flex flex-col", day.isToday && "rounded-md ring-2 ring-primary/40")}>
      <div className="mb-1 text-center text-xs font-medium capitalize">{day.label}</div>
      <div className="relative rounded-md border" style={{ height: hours.length * HOUR_HEIGHT_PX }}>
        {hours.map((h, i) => (
          <HourSlot key={h} dateKey={day.dateKey} hour={h} top={i * HOUR_HEIGHT_PX} />
        ))}
        {sorted.map((entry, i) => {
          const top = Math.max(0, offsetPx(new Date(entry.dateDebut), gridStart));
          const height = Math.max(18, offsetPx(new Date(entry.dateFin), gridStart) - top);
          const next = sorted[i + 1];
          const tight = next ? detectTightTransition(entry, next) : false;
          return <EntryBlock key={entry.id} entry={entry} top={top} height={height} onEdit={() => onEdit(entry)} tightTransition={tight} />;
        })}
      </div>
    </div>
  );
}

/** Vue Semaine (§28) : grille horaire, une colonne par jour — même mécanique que la vue Jour (voir personal-planning-grid.ts). */
export function PersonalPlanningWeek({ days, refData }: { days: PersonalPlanningDay[]; refData: PersonalPlanningReferenceData }) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);

  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" && !editing.meetingHref ? { ...editing, type: editing.type } : null;

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2" style={{ minWidth: 900 }}>
        <div className="col-span-7 flex items-center gap-2 pl-14 text-[10px] text-muted-foreground">
          Grille {GRID_START_HOUR}h–{GRID_END_HOUR}h — glissez un bloc pour le déplacer.
        </div>
        {days.map((day) => (
          <DayColumn key={day.key} day={day} onEdit={setEditing} />
        ))}
      </div>

      {editData && (
        <PersonalPlanningEntryEditDialog
          entry={editData}
          open={!!editing}
          onOpenChange={(o) => setEditing(o ? editing : null)}
          refData={refData}
        />
      )}
    </div>
  );
}
