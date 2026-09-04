/**
 * Demande utilisateur — bande visuelle non interactive signalant une pause
 * configurée (UserWorkSchedule.breaks) sur la grille horaire Jour/Semaine.
 * `pointer-events-none` : ne bloque jamais un clic sur une activité qui la
 * chevaucherait (ex. Indisponible/Réservé, exemptés du respect des horaires).
 */
export function BreakBand({ top, height }: { top: number; height: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-0 flex items-center justify-center overflow-hidden border-y border-dashed border-muted-foreground/30 bg-muted/40"
      style={{ top, height }}
    >
      {height >= 18 && <span className="text-[10px] text-muted-foreground/70">Pause</span>}
    </div>
  );
}
