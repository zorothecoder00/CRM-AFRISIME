/**
 * Génère les dates des occurrences suivantes d'une réunion récurrente
 * (cahier des charges §XI). Pas de moteur RRULE : un simple pas fixe
 * (semaine ou mois), plafonné à MAX_OCCURRENCES pour rester borné même
 * sans date de fin fournie.
 */
const MAX_OCCURRENCES = 12;

export function buildRecurrenceDates(
  start: Date,
  recurrence: "HEBDOMADAIRE" | "MENSUELLE",
  endDate?: Date
): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);

  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    current =
      recurrence === "HEBDOMADAIRE"
        ? new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7, current.getHours(), current.getMinutes())
        : new Date(current.getFullYear(), current.getMonth() + 1, current.getDate(), current.getHours(), current.getMinutes());

    if (endDate && current > endDate) break;
    dates.push(new Date(current));
  }

  return dates;
}
