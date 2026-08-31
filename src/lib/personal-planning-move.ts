import type { Prisma } from "@/generated/prisma/client";

/**
 * Déplace une entrée à une nouvelle date/heure de début en conservant sa
 * durée d'origine (§14 drag & drop) — et, si elle planifie une Tâche
 * (tacheId), répercute la nouvelle date de fin sur `Task.echeance` : c'est
 * le principe §4 "une tâche, plusieurs vues", l'activité EST la vue
 * planifiée de la tâche.
 *
 * §46 — extrait de personal-planning.actions.ts (fichier "use server") vers
 * ce lib plain : un appelant a toujours déjà vérifié l'autorisation sur
 * l'entrée avant d'appeler ceci, mais un helper exporté depuis un module
 * "use server" devient malgré tout un endpoint invocable directement — donc
 * mieux vaut qu'il ne vive pas là du tout plutôt que de compter sur cette
 * vérification amont pour rester correcte indéfiniment.
 */
export async function moveEntryToDate(tx: Prisma.TransactionClient, entryId: string, newDateDebut: Date) {
  const existing = await tx.personalPlanningEntry.findUniqueOrThrow({ where: { id: entryId } });
  const durationMs = existing.dateFin.getTime() - existing.dateDebut.getTime();
  const newDateFin = new Date(newDateDebut.getTime() + durationMs);

  const updated = await tx.personalPlanningEntry.update({
    where: { id: entryId },
    data: { dateDebut: newDateDebut, dateFin: newDateFin },
  });

  if (existing.tacheId) {
    await tx.task.update({ where: { id: existing.tacheId }, data: { echeance: newDateFin } });
  }

  return updated;
}
