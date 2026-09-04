"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { ENTRY_TYPE_META } from "@/lib/personal-planning-types";
import { HOUR_HEIGHT_PX } from "@/lib/personal-planning-grid";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import { cn } from "@/lib/utils";
import { GripVertical, Lock } from "lucide-react";

/** Bandeau "toute la journée" (Mission multi-jours) — teinte pleine conservée, forme en pilule. */
const PRIORITE_PILL: Record<string, string> = {
  CRITIQUE: "bg-destructive/15 border-destructive text-destructive-foreground",
  HAUTE: "bg-warning/15 border-warning",
  NORMALE: "bg-primary/15 border-primary",
  FAIBLE: "bg-muted/40 border-muted-foreground",
};

/**
 * Demande utilisateur — cases de la grille horaire (Jour/Semaine) dans un
 * style "carte de stat" : fond sobre uniforme (bg-card), seul le bord GAUCHE
 * (épais, couleur pleine) signale la priorité, plutôt que de teinter toute
 * la case.
 */
export const PRIORITE_ACCENT: Record<string, string> = {
  CRITIQUE: "border-l-destructive",
  HAUTE: "border-l-warning",
  NORMALE: "border-l-primary",
  FAIBLE: "border-l-muted-foreground",
};

/** Au-delà de 2h, un simple bloc icône+titre en haut laisse trop de vide en dessous (demande utilisateur). */
const TALL_BLOCK_THRESHOLD_PX = HOUR_HEIGHT_PX * 2;

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
  const colors = allDay
    ? (PRIORITE_PILL[entry.priorite] ?? PRIORITE_PILL.NORMALE)
    : (PRIORITE_ACCENT[entry.priorite] ?? PRIORITE_ACCENT.NORMALE);
  const late = end < new Date() && !["TERMINEE", "ANNULEE"].includes(entry.statut);
  const isTall = !allDay && (height ?? 0) >= TALL_BLOCK_THRESHOLD_PX;
  const className = allDay
    ? cn(
        "flex w-full items-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-left text-[11px]",
        colors,
        isDragging && "opacity-40",
        (late || tightTransition) && "ring-1 ring-destructive"
      )
    : cn(
        "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 bg-card p-1 text-left text-xs",
        colors,
        draggable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40",
        (late || tightTransition) && "ring-1 ring-destructive"
      );
  const style = allDay ? undefined : { top, height };
  const title = allDay
    ? `${entry.titre} — du ${start.toLocaleDateString("fr-FR")} au ${end.toLocaleDateString("fr-FR")}`
    : undefined;

  const timeRangeLabel = `${clippedAtStart ? "… " : ""}${start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${clippedAtEnd ? " …" : ""}`;

  const inner = allDay ? (
    <>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate font-medium">{entry.titre}</span>
    </>
  ) : isTall ? (
    // Demande utilisateur — une activité de plusieurs heures laissait tout
    // l'espace sous l'icône/titre vide ; le titre s'écrit maintenant tout le
    // long du créneau (texte vertical) au lieu de rester coincé en haut.
    <div className="flex h-full items-stretch gap-1">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        {draggable && <GripVertical className="h-3 w-3 text-muted-foreground/50" />}
        <Icon className="h-3 w-3 shrink-0" />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
        <span
          className="[text-orientation:sideways] truncate font-medium [writing-mode:vertical-rl]"
          title={`${entry.titre} — ${timeRangeLabel}`}
        >
          {entry.titre} · {timeRangeLabel}
          {entry.blockedByTitre && ` · 🔒 ${entry.blockedByTitre}`}
        </span>
      </div>
    </div>
  ) : (
    <>
      <span className="flex items-center gap-1 font-medium">
        {draggable && <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{entry.titre}</span>
      </span>
      <span className="text-[10px] text-muted-foreground">{timeRangeLabel}</span>
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
