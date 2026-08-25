// Change Request Management (Project Studio §31) — "le systeme calcule"
// l'impact financier/calendrier : compare a la volee les valeurs proposees
// aux valeurs actuelles du projet plutot que de les stocker (jamais
// desynchronise si le budget/la date de fin du projet changent entre-temps).

export type ChangeRequestImpact = {
  impactFinancier: number | null;
  impactFinancierPourcent: number | null;
  impactCalendrierJours: number | null;
};

export function computeChangeRequestImpact(params: {
  budgetActuel: number | null;
  budgetPropose: number | null;
  dateFinActuelle: Date | null;
  dateFinProposee: Date | null;
}): ChangeRequestImpact {
  const impactFinancier =
    params.budgetActuel !== null && params.budgetPropose !== null ? params.budgetPropose - params.budgetActuel : null;

  const impactFinancierPourcent =
    impactFinancier !== null && params.budgetActuel
      ? Math.round((impactFinancier / params.budgetActuel) * 1000) / 10
      : null;

  const impactCalendrierJours =
    params.dateFinActuelle && params.dateFinProposee
      ? Math.round((params.dateFinProposee.getTime() - params.dateFinActuelle.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  return { impactFinancier, impactFinancierPourcent, impactCalendrierJours };
}
