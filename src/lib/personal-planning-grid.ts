/**
 * Grille horaire partagée entre la vue Jour et la vue Semaine (§28) — mêmes
 * constantes et calcul de position pour ne pas dupliquer la logique entre
 * `personal-planning-day.tsx` et `personal-planning-week.tsx`.
 */
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 20;
export const HOUR_HEIGHT_PX = 56;

export function gridHours(startHour: number = GRID_START_HOUR, endHour: number = GRID_END_HOUR): number[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
}

export function gridStartOf(day: Date, startHour: number = GRID_START_HOUR): Date {
  const start = new Date(day);
  start.setHours(startHour, 0, 0, 0);
  return start;
}

export type GridBounds = { startHour: number; endHour: number };

/**
 * §26bis/§27 — une activité (typiquement une Mission étalée sur la journée
 * entière, voire plusieurs jours) peut déborder de la plage par défaut
 * 7h-20h ; sans ça, la grille la tronque net à 20h sans aucun indice que ça
 * continue au-delà. Étend les bornes pour couvrir la portion de chaque
 * entrée réellement comprise dans ce jour-là (jamais au-delà de 0h-24h).
 */
export function computeGridBounds(entries: { dateDebut: string; dateFin: string }[], day: Date): GridBounds {
  let startHour = GRID_START_HOUR;
  let endHour = GRID_END_HOUR;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

  for (const e of entries) {
    const entryStart = new Date(e.dateDebut);
    const entryEnd = new Date(e.dateFin);
    if (entryEnd < dayStart || entryStart > dayEnd) continue;

    const clippedStart = entryStart < dayStart ? dayStart : entryStart;
    const clippedEnd = entryEnd > dayEnd ? dayEnd : entryEnd;
    startHour = Math.min(startHour, clippedStart.getHours());
    const endFractionalHour = clippedEnd.getHours() + clippedEnd.getMinutes() / 60 + clippedEnd.getSeconds() / 3600;
    endHour = Math.max(endHour, Math.ceil(endFractionalHour));
  }

  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

export function offsetPx(date: Date, gridStart: Date): number {
  const minutes = (date.getTime() - gridStart.getTime()) / 60000;
  return (minutes / 60) * HOUR_HEIGHT_PX;
}

export function dateKeyOf(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}
