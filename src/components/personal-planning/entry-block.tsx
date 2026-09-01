"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { cn } from "@/lib/utils";
import { GripVertical, Lock } from "lucide-react";

export const PRIORITE_BG: Record<string, string> = {
  CRITIQUE: "bg-destructive/15 border-destructive text-destructive-foreground",
  HAUTE: "bg-warning/15 border-warning",
  NORMALE: "bg-primary/15 border-primary",
  FAIBLE: "bg-muted/40 border-muted-foreground",
};

/**
 * Bloc positionné en absolu dans une grille horaire (vue Jour §7 et vue
 * Semaine §28) — partagé pour ne pas dupliquer drag/late/couleurs entre les
 * deux vues. En mode `allDay` (activité qui couvre toute la journée visible,
 * typiquement une Mission multi-jours), rendu en bandeau compact au lieu
 * d'un bloc étiré sur toute la hauteur de la grille — sans glisser-déposer
 * (déplacer une activité de plusieurs jours vers un créneau horaire précis
 * n'a pas de sens).
 */
export function EntryBlock({
  entry,
  top,
  height,
  onEdit,
  tightTransition,
  readOnly,
  rangeStart,
  rangeEnd,
  clippedAtStart,
  clippedAtEnd,
  allDay,
}: {
  entry: PersonalPlanningEntryRow;
  top?: number;
  height?: number;
  onEdit: () => void;
  /** §27 — peu de temps pour se déplacer avant/après cette entrée. */
  tightTransition?: boolean;
  /** §46 — vue manager sur le planning d'un subordonné : ni glissé, ni édition, ni navigation. */
  readOnly?: boolean;
  /** §26bis — heures affichées dans le libellé, bornées au jour visible (voir clippedEntryRange) ; par défaut les dates réelles de l'entrée. */
  rangeStart?: Date;
  rangeEnd?: Date;
  /** Affiche "…" côté début/fin quand l'activité continue hors de ce jour. */
  clippedAtStart?: boolean;
  clippedAtEnd?: boolean;
  /** Rendu en bandeau compact (pas de position/hauteur, pas de glisser). */
  allDay?: boolean;
}) {
  const isMeeting = !!entry.meetingHref;
  const draggable = !readOnly && !allDay && entry.type !== "RESERVE" && !isMeeting;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: { originalDateDebut: entry.dateDebut },
    disabled: !draggable,
  });
  const start = rangeStart ?? new Date(entry.dateDebut);
  const end = rangeEnd ?? new Date(entry.dateFin);
  const meta = ENTRY_TYPE_META[entry.type];
  const Icon = meta.icon;
  const colors = PRIORITE_BG[entry.priorite] ?? PRIORITE_BG.NORMALE;
  const late = end < new Date() && !["TERMINEE", "ANNULEE"].includes(entry.statut);
  const className = allDay
    ? cn(
        "flex w-full items-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-left text-[11px]",
        colors,
        isDragging && "opacity-40",
        (late || tightTransition) && "ring-1 ring-destructive"
      )
    : cn(
        "absolute left-1 right-1 overflow-hidden rounded-md border-l-2 p-1 text-left text-xs",
        colors,
        draggable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40",
        (late || tightTransition) && "ring-1 ring-destructive"
      );
  const style = allDay ? undefined : { top, height };
  const title = allDay
    ? `${entry.titre} — du ${start.toLocaleDateString("fr-FR")} au ${end.toLocaleDateString("fr-FR")}`
    : undefined;

  const inner = allDay ? (
    <>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate font-medium">{entry.titre}</span>
    </>
  ) : (
    <>
      <span className="flex items-center gap-1 font-medium">
        {draggable && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{entry.titre}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">
        {clippedAtStart && "… "}
        {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}–
        {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        {clippedAtEnd && " …"}
      </span>
      {entry.blockedByTitre && (
        <span className="flex items-center gap-0.5 truncate text-[10px] text-muted-foreground" title={`Dépend de : ${entry.blockedByTitre}`}>
          <Lock className="h-2.5 w-2.5 shrink-0" />
          {entry.blockedByTitre}
        </span>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div className={className} style={style} title={title}>
        {inner}
      </div>
    );
  }

  if (isMeeting) {
    return (
      <Link href={entry.meetingHref!} className={className} style={style} title={title}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onEdit}
      className={className}
      style={style}
      title={title}
      {...(allDay ? {} : listeners)}
      {...(allDay ? {} : attributes)}
    >
      {inner}
    </button>
  );
}
