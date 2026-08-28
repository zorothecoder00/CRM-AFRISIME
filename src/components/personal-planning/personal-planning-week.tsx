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
  return (
    <div ref={setNodeRef} className={cn("absolute inset-x-0 border-t border-border/50", isOver && "bg-primary/10")} style={{ top, height: HOUR_HEIGHT_PX }} />
  );
}

/** Repères d'heure partagés à gauche de la grille — une seule fois pour les 7 colonnes, alignés sur les mêmes `HOUR_HEIGHT_PX`. */
function HourGutter({ hours }: { hours: number[] }) {
  return (
    <div className="w-10 shrink-0">
      <div className="mb-1 h-4 invisible text-xs">.</div>
      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT_PX }}>
        {hours.map((h, i) => (
          <span
            key={h}
            className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
            style={{ top: i * HOUR_HEIGHT_PX }}
          >
            {String(h).padStart(2, "0")}h
          </span>
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  onEdit,
  readOnly,
}: {
  day: PersonalPlanningDay;
  onEdit: (entry: PersonalPlanningEntryRow) => void;
  readOnly?: boolean;
}) {
  const hours = gridHours();
  const gridStart = gridStartOf(new Date(day.dateKey));
  const sorted = [...day.entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  return (
    <div className={cn("flex flex-col", day.isToday && "rounded-md ring-2 ring-primary/40")}>
      <div className="mb-1 text-center text-xs font-medium capitalize">{day.label}</div>
      <div className="relative rounded-md border" style={{ height: hours.length * HOUR_HEIGHT_PX }}>
        {/* §46 — vue manager en lecture seule : pas de cases de dépôt, rien à glisser (pas de DndContext ancêtre non plus). */}
        {!readOnly && hours.map((h, i) => <HourSlot key={h} dateKey={day.dateKey} hour={h} top={i * HOUR_HEIGHT_PX} />)}
        {sorted.map((entry, i) => {
          const top = Math.max(0, offsetPx(new Date(entry.dateDebut), gridStart));
          const height = Math.max(18, offsetPx(new Date(entry.dateFin), gridStart) - top);
          const next = sorted[i + 1];
          const tight = next ? detectTightTransition(entry, next) : false;
          return (
            <EntryBlock
              key={entry.id}
              entry={entry}
              top={top}
              height={height}
              onEdit={() => onEdit(entry)}
              tightTransition={tight}
              readOnly={readOnly}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vue Semaine (§28) : grille horaire, une colonne par jour — même mécanique
 * que la vue Jour (voir personal-planning-grid.ts). `readOnly` (§46, vue
 * manager sur le planning d'un subordonné) désactive le glissé et l'édition
 * — `refData` devient alors inutile et n'a pas besoin d'être fourni.
 */
export function PersonalPlanningWeek({
  days,
  refData,
  readOnly = false,
}: {
  days: PersonalPlanningDay[];
  refData?: PersonalPlanningReferenceData;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);

  const editData: PersonalPlanningEntryEditData | null =
    !readOnly && editing && editing.type !== "RESERVE" && !editing.meetingHref ? { ...editing, type: editing.type } : null;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }}>
        <div className="pl-12 text-[10px] text-muted-foreground">
          {readOnly ? `Grille ${GRID_START_HOUR}h–${GRID_END_HOUR}h — lecture seule.` : `Grille ${GRID_START_HOUR}h–${GRID_END_HOUR}h — glissez un bloc pour le déplacer.`}
        </div>
        <div className="flex gap-2">
          <HourGutter hours={gridHours()} />
          <div className="grid flex-1 grid-cols-7 gap-2">
            {days.map((day) => (
              <DayColumn key={day.key} day={day} onEdit={setEditing} readOnly={readOnly} />
            ))}
          </div>
        </div>
      </div>

      {editData && refData && (
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
