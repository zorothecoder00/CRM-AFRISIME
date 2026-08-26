/**
 * Filtre annuel/mensuel (listes Projets/Tâches) — un mois sans année n'a pas
 * de sens seul, donc `mois` n'est appliqué que si `annee` est aussi fourni.
 */
export function buildDateRangeFilter(annee?: string, mois?: string): { gte: Date; lt: Date } | null {
  if (!annee) return null;
  const year = Number(annee);
  if (!Number.isInteger(year)) return null;

  if (mois) {
    const month = Number(mois);
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
  }

  return { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
}
