"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import { EntryBlock } from "@/components/personal-planning/entry-block";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { detectTightTransition } from "@/lib/personal-planning-workload";
import { cn } from "@/lib/utils";
import type { PersonalPlanningEntryType } from "@/lib/personal-planning-types";
import { HOUR_HEIGHT_PX, THIN_SCROLLBAR_CLASS, gridHours, gridStartOf, offsetPx, clippedEntryRange, isMultiDayEntry, type GridBounds } from "@/lib/personal-planning-grid";

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
  /** §39/§41 — jour férié, congé approuvé, absence exceptionnelle ou jour non ouvrable, s'il y a lieu. */
  nonWorkingReason?: { label: string; kind: "ferie" | "conge" | "absence" | "non_ouvrable" } | null;
};

const NON_WORKING_STYLES: Record<string, { emoji: string; badge: string; bg: string }> = {
  ferie: { emoji: "🎉", badge: "bg-destructive/10 text-destructive", bg: "bg-destructive/5" },
  conge: { emoji: "🏖️", badge: "bg-primary/10 text-primary", bg: "bg-primary/5" },
  absence: { emoji: "🚫", badge: "bg-warning/15 text-warning", bg: "bg-warning/5" },
  non_ouvrable: { emoji: "📅", badge: "bg-muted text-muted-foreground", bg: "bg-muted/30" },
};

type AllDaySpan = { entry: PersonalPlanningEntryRow; startCol: number; endCol: number };

/** Regroupe chaque activité multi-jours en un seul bandeau continu (colonne de début → colonne de fin) au lieu de la répéter dans chaque jour. */
function computeAllDaySpans(days: PersonalPlanningDay[]): AllDaySpan[] {
  const byId = new Map<string, AllDaySpan>();
  days.forEach((day, colIndex) => {
    for (const entry of day.entries) {
      if (!isMultiDayEntry(entry)) continue;
      const existing = byId.get(entry.id);
      if (existing) {
        existing.startCol = Math.min(existing.startCol, colIndex);
        existing.endCol = Math.max(existing.endCol, colIndex);
      } else {
        byId.set(entry.id, { entry, startCol: colIndex, endCol: colIndex });
      }
    }
  });
  return [...byId.values()].sort((a, b) => a.entry.dateDebut.localeCompare(b.entry.dateDebut));
}

/** Bandeau des activités multi-jours (façon "all-day" des agendas Google/Outlook), au-dessus de la grille horaire — absent si la semaine n'en compte aucune. */
function AllDayRow({
  days,
  onEdit,
  readOnly,
}: {
  days: PersonalPlanningDay[];
  onEdit: (entry: PersonalPlanningEntryRow) => void;
  readOnly?: boolean;
}) {
  const spans = computeAllDaySpans(days);
  if (spans.length === 0) return null;

  return (
    <div className="flex border-b bg-muted/10 py-1">
      <div className="w-12 shrink-0" />
      <div className="flex-1 space-y-1">
        {spans.map(({ entry, startCol, endCol }) => (
          <div key={entry.id} className="grid grid-cols-7">
            <div style={{ gridColumn: `${startCol + 1} / ${endCol + 2}` }} className="px-1">
              <EntryBlock entry={entry} onEdit={() => onEdit(entry)} readOnly={readOnly} allDay />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourSlot({ dateKey, hour, top }: { dateKey: string; hour: number; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${dateKey}-${hour}`, data: { date: dateKey, hour } });
  return (
    <div ref={setNodeRef} className={cn("absolute inset-x-0 border-t border-border/50", isOver && "bg-primary/10")} style={{ top, height: HOUR_HEIGHT_PX }} />
  );
}

/** Repères d'heure partagés à gauche de la grille — une seule fois pour les 7 colonnes, alignés sur les mêmes `HOUR_HEIGHT_PX`. */
function HourGutter({ hours }: { hours: number[] }) {
  return (
    <div className="w-12 shrink-0 border-r bg-muted/30">
      <div className="relative" style={{ height: hours.length * HOUR_HEIGHT_PX }}>
        {hours.map((h, i) => (
          <span
            key={h}
            className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground"
            style={{ top: i * HOUR_HEIGHT_PX }}
          >
            {String(h).padStart(2, "0")}h
          </span>
        ))}
      </div>
    </div>
  );
}

/** En-tête d'une colonne jour (nom + date, mise en évidence si "aujourd'hui") — grille continue façon calendrier (§28), pas des mini-cartes séparées. */
function DayHeaderCell({ day }: { day: PersonalPlanningDay }) {
  const nonWorkingStyle = day.nonWorkingReason ? NON_WORKING_STYLES[day.nonWorkingReason.kind] : null;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 border-r px-1 py-2 last:border-r-0",
        day.isToday && "bg-primary/10"
      )}
    >
      <span className={cn("text-xs capitalize", day.isToday ? "font-bold text-primary" : "font-medium")}>{day.label}</span>
      {day.isToday && <span className="text-[9px] font-semibold tracking-wide text-primary uppercase">Aujourd&apos;hui</span>}
      {day.nonWorkingReason && nonWorkingStyle && (
        <span
          className={cn("mt-0.5 truncate rounded px-1 py-0.5 text-center text-[9px] font-medium", nonWorkingStyle.badge)}
          title={day.nonWorkingReason.label}
        >
          {nonWorkingStyle.emoji} {day.nonWorkingReason.label}
        </span>
      )}
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
  // Les activités multi-jours sont rendues à part, dans AllDayRow (bandeau continu).
  const sorted = [...day.entries].filter((e) => !isMultiDayEntry(e)).sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const nonWorkingStyle = day.nonWorkingReason ? NON_WORKING_STYLES[day.nonWorkingReason.kind] : null;

  return (
    <div
      className={cn("relative border-r last:border-r-0", day.isToday ? "bg-primary/5" : nonWorkingStyle?.bg)}
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

  // Journée complète (0h-24h) toujours affichée, sur les 7 colonnes — comme
  // la vue Jour, plus de plage 7h-20h qui masquait les activités matinales/
  // nocturnes selon les jours ; le défilement interne plus bas évite qu'un
  // tableau de 24 lignes n'allonge toute la page.
  const bounds: GridBounds = { startHour: 0, endHour: 24 };

  return (
    <div>
      {/* Pas de défilement horizontal ni de largeur minimale ici : la grille
          remplit toujours exactement la largeur visible. Avec un défilement
          horizontal, le curseur du défilement vertical (à droite de cette
          boîte) se retrouvait positionné au bord droit du contenu — hors
          champ, invisible tant qu'on n'avait pas d'abord défilé vers la
          droite. */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground">
          {readOnly
            ? `Grille ${bounds.startHour}h–${bounds.endHour}h — lecture seule.`
            : `Grille ${bounds.startHour}h–${bounds.endHour}h — glissez un bloc pour le déplacer.`}
        </div>

        <div className="flex border-b">
          <div className="w-12 shrink-0 border-r bg-muted/30" />
          <div className="grid flex-1 grid-cols-7">
            {days.map((day) => (
              <DayHeaderCell key={day.key} day={day} />
            ))}
          </div>
        </div>

        <AllDayRow days={days} onEdit={setEditing} readOnly={readOnly} />

        {/* Hauteur FIXE (pas un simple max-height) + défilement interne :
            toutes les heures restent présentes, juste consultables par
            défilement à l'intérieur de cette zone plutôt que d'étirer toute
            la page. Fixe plutôt que "s'adapte au contenu" pour que la
            grille garde la même taille d'une semaine à l'autre (sinon une
            semaine chargée donne un pavé haut et une semaine calme un pavé
            bas — gênant visuellement) — l'en-tête des jours au-dessus reste
            toujours visible. pt/pb : les repères d'heure (HourGutter) sont
            centrés sur leur ligne via -translate-y-1/2, donc "00h" déborde
            légèrement au-dessus de top:0 — sans cette marge, le conteneur
            défilant le rognait (invisible, même en remontant tout en haut). */}
        <div className={cn("flex h-[min(70vh,900px)] overflow-y-auto pt-2 pb-2", THIN_SCROLLBAR_CLASS)}>
          <HourGutter hours={gridHours(bounds.startHour, bounds.endHour)} />
          <div className="grid flex-1 grid-cols-7">
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
