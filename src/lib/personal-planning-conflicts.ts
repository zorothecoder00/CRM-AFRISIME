import { prisma } from "@/lib/prisma";

/**
 * §42 — détecte un chevauchement horaire pour l'utilisateur, jamais
 * bloquant (même logique avertissement que §39/§41, voir
 * personal-planning-holidays.ts) : ses autres activités actives ET ses
 * réunions (Meeting, en tant que participant). Retourne le titre du premier
 * conflit trouvé.
 */
export async function findScheduleConflict(
  userId: string,
  dateDebut: Date,
  dateFin: Date,
  excludeEntryId?: string
): Promise<string | null> {
  const [entry, meeting] = await Promise.all([
    prisma.personalPlanningEntry.findFirst({
      where: {
        userId,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
        statut: { notIn: ["TERMINEE", "ANNULEE"] },
        dateDebut: { lt: dateFin },
        dateFin: { gt: dateDebut },
      },
      select: { titre: true },
    }),
    prisma.meeting.findFirst({
      where: {
        participants: { some: { userId } },
        // Meeting n'a qu'une dateHeure (pas de fin stockée) — un chevauchement
        // simple : sa date/heure tombe dans la plage testée.
        dateHeure: { gte: dateDebut, lt: dateFin },
      },
      select: { titre: true },
    }),
  ]);

  return entry?.titre ?? meeting?.titre ?? null;
}
