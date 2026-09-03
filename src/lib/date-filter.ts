import { startOfWeek, addDays, startOfDay } from "date-fns";

/**
 * Filtre annuel/mensuel (listes Projets/Tâches) — un mois sans année n'a pas
 * de sens seul, donc `mois` n'est appliqué que si `annee` est aussi fourni.
 * `semaine`/`jour` (mes-taches uniquement, §demande utilisateur) sont des
 * modes alternatifs et prioritaires : une date ISO (yyyy-MM-dd), respectivement
 * élargie à toute sa semaine (lundi-dimanche) ou restreinte à sa seule journée.
 */
export function buildDateRangeFilter(
  annee?: string,
  mois?: string,
  semaine?: string,
  jour?: string
): { gte: Date; lt: Date } | null {
  if (jour) {
    const d = new Date(jour);
    if (Number.isNaN(d.getTime())) return null;
    const start = startOfDay(d);
    return { gte: start, lt: addDays(start, 1) };
  }

  if (semaine) {
    const d = new Date(semaine);
    if (Number.isNaN(d.getTime())) return null;
    const start = startOfWeek(d, { weekStartsOn: 1 });
    return { gte: start, lt: addDays(start, 7) };
  }

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
