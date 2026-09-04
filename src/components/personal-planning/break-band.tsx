/**
 * Demande utilisateur — bande visuelle non interactive signalant une pause
 * configurée (UserWorkSchedule.breaks) sur la grille horaire Jour/Semaine.
 * Teinte violette dédiée (cohérente avec le badge "violet" déjà utilisé
 * ailleurs) — distincte du fond sobre des cases d'activité (bg-card) et de
 * la grille elle-même, pour qu'une pause se reconnaisse au premier coup
 * d'œil. `pointer-events-none` : ne bloque jamais un clic sur une activité
 * qui la chevaucherait (ex. Indisponible/Réservé, exemptés du respect des
 * horaires).
 */
export function BreakBand({ top, height }: { top: number; height: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-0 flex items-center justify-center overflow-hidden border-y border-dashed border-violet-500/40 bg-violet-500/10 dark:bg-violet-500/15"
      style={{ top, height }}
    >
      {height >= 18 && <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Pause</span>}
    </div>
  );
}
