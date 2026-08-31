"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import { EntryBlock } from "@/components/personal-planning/entry-block";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { detectTightTransition } from "@/lib/personal-planning-workload";
import { cn } from "@/lib/utils";
import type { PersonalPlanningEntryType } from "@/lib/personal-planning-types";
import { GRID_START_HOUR, GRID_END_HOUR, HOUR_HEIGHT_PX, gridHours, gridStartOf, offsetPx, computeGridBounds, clippedEntryRange, type GridBounds } from "@/lib/personal-planning-grid";

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
  /** §39 — nom du jour férié si ce jour en est un, null sinon. */
  holidayName?: string | null;
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
  bounds,
  onEdit,
  readOnly,
}: {
  day: PersonalPlanningDay;
  bounds: GridBounds;
  onEdit: (entry: PersonalPlanningEntryRow) => void;
  readOnly?: boolean;
}) {
  const hours = gridHours(bounds.startHour, bounds.endHour);
  const dayDate = new Date(day.dateKey);
  const gridStart = gridStartOf(dayDate, bounds.startHour);
  const sorted = [...day.entries].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  return (
    <div className={cn("flex flex-col", day.isToday && "rounded-md ring-2 ring-primary/40")}>
      <div className="mb-1 text-center text-xs font-medium capitalize">{day.label}</div>
      {day.holidayName && (
        <div className="mb-1 truncate rounded bg-destructive/10 px-1 py-0.5 text-center text-[10px] font-medium text-destructive" title={day.holidayName}>
          🎉 {day.holidayName}
        </div>
      )}
      <div
        className={cn("relative rounded-md border", day.holidayName && "bg-destructive/5")}
        style={{ height: hours.length * HOUR_HEIGHT_PX }}
      >
        {/* §46 — vue manager en lecture seule : pas de cases de dépôt, rien à glisser (pas de DndContext ancêtre non plus). */}
        {!readOnly && hours.map((h, i) => <HourSlot key={h} dateKey={day.dateKey} hour={h} top={i * HOUR_HEIGHT_PX} />)}
        {sorted.map((entry, i) => {
          const range = clippedEntryRange(entry, dayDate);
          const top = Math.max(0, offsetPx(range.start, gridStart));
          const height = Math.max(18, offsetPx(range.end, gridStart) - top);
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
              rangeStart={range.start}
              rangeEnd={range.end}
              clippedAtStart={range.clippedAtStart}
              clippedAtEnd={range.clippedAtEnd}
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

  // §26bis/§27 — bornes partagées par les 7 colonnes (elles doivent rester
  // alignées) : la plus large des bornes par jour, pour qu'une activité qui
  // déborde de 7h-20h un jour donné (ex. une Mission) reste visible sans
  // décaler les autres colonnes.
  const bounds = days.reduce<GridBounds>(
    (acc, day) => {
      const b = computeGridBounds(day.entries, new Date(day.dateKey));
      return { startHour: Math.min(acc.startHour, b.startHour), endHour: Math.max(acc.endHour, b.endHour) };
    },
    { startHour: GRID_START_HOUR, endHour: GRID_END_HOUR }
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }}>
        <div className="pl-12 text-[10px] text-muted-foreground">
          {readOnly
            ? `Grille ${bounds.startHour}h–${bounds.endHour}h — lecture seule.`
            : `Grille ${bounds.startHour}h–${bounds.endHour}h — glissez un bloc pour le déplacer.`}
        </div>
        <div className="flex gap-2">
          <HourGutter hours={gridHours(bounds.startHour, bounds.endHour)} />
          <div className="grid flex-1 grid-cols-7 gap-2">
            {days.map((day) => (
              <DayColumn key={day.key} day={day} bounds={bounds} onEdit={setEditing} readOnly={readOnly} />
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
