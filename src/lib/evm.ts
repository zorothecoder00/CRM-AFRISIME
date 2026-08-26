const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type EvmResult = {
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number;
  etc: number;
  vac: number;
};

/**
 * Earned Value Management (cahier des charges Project Studio §43) — "pour
 * les projets suffisamment structurés" : renvoie null si le projet n'a pas
 * de budget (BAC) ou de dates de début/fin (nécessaires pour la Valeur
 * Planifiée), plutôt que d'afficher des ratios dénués de sens.
 *
 * - BAC (Budget At Completion) = Project.budget.
 * - PV (Planned Value) = BAC × avancement planifié au temps T, où
 *   l'avancement planifié suit une progression linéaire entre dateDebut et
 *   dateFin (aucun plan de charge daté par tâche n'existe dans le modèle —
 *   c'est l'approximation standard en l'absence de baseline détaillée).
 * - EV (Earned Value) = BAC × avancement réel (Project.avancement).
 * - AC (Actual Cost) = Project.coutReel.
 * - CPI = EV / AC, SPI = EV / PV — null si le dénominateur est nul (pas
 *   encore de dépense / pas encore de temps écoulé), plutôt que Infinity/NaN.
 * - EAC (Estimate At Completion) = BAC / CPI si CPI défini, sinon AC + (BAC − EV)
 *   (hypothèse neutre : le reste du travail coûtera son budget restant).
 * - ETC (Estimate To Complete) = EAC − AC.
 * - VAC (Variance At Completion) = BAC − EAC.
 */
export function computeEvm(input: {
  budget: number | null;
  coutReel: number | null;
  avancement: number;
  dateDebut: Date | null;
  dateFin: Date | null;
  now?: Date;
}): EvmResult | null {
  const { budget, coutReel, avancement, dateDebut, dateFin } = input;
  if (budget === null || budget <= 0 || !dateDebut || !dateFin || dateFin.getTime() <= dateDebut.getTime()) {
    return null;
  }

  const now = input.now ?? new Date();
  const totalDays = (dateFin.getTime() - dateDebut.getTime()) / MS_PER_DAY;
  const elapsedDays = (now.getTime() - dateDebut.getTime()) / MS_PER_DAY;
  const plannedPct = Math.min(Math.max(elapsedDays / totalDays, 0), 1);

  const bac = budget;
  const pv = bac * plannedPct;
  const ev = bac * (avancement / 100);
  const ac = coutReel ?? 0;

  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;

  const eac = cpi !== null && cpi > 0 ? bac / cpi : ac + (bac - ev);
  const etc = eac - ac;
  const vac = bac - eac;

  return { bac, pv, ev, ac, cpi, spi, eac, etc, vac };
}
