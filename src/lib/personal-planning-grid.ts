/**
 * Grille horaire partagée entre la vue Jour et la vue Semaine (§28) — mêmes
 * constantes et calcul de position pour ne pas dupliquer la logique entre
 * `personal-planning-day.tsx` et `personal-planning-week.tsx`.
 */
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 20;
export const HOUR_HEIGHT_PX = 56;

export function gridHours(): number[] {
  return Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i);
}

export function gridStartOf(day: Date): Date {
  const start = new Date(day);
  start.setHours(GRID_START_HOUR, 0, 0, 0);
  return start;
}

export function offsetPx(date: Date, gridStart: Date): number {
  const minutes = (date.getTime() - gridStart.getTime()) / 60000;
  return (minutes / 60) * HOUR_HEIGHT_PX;
}

export function dateKeyOf(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}
