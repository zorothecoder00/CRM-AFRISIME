import { prisma } from "@/lib/prisma";

// Meme duree par defaut que personal-planning-slot-suggestion.ts et
// meeting.actions.ts — Meeting n'a pas de champ duree stocke.
const MEETING_DEFAULT_DURATION_MINUTES = 60;

export type ScheduleConflict = {
  titre: string;
  /** Id de l'autre PersonalPlanningEntry en conflit, si c'en est une (pas une réunion). */
  entryId: string | null;
  /** Lien vers la réunion en conflit, si c'en est une. */
  meetingHref: string | null;
  // Demande utilisateur — le message d'erreur doit dire QUAND l'activité en
  // conflit occupe le créneau, pas seulement son titre.
  dateDebut: Date;
  dateFin: Date;
};

/**
 * §42 — détecte un chevauchement horaire pour l'utilisateur, jamais
 * bloquant (même logique avertissement que §39/§41, voir
 * personal-planning-holidays.ts) : ses autres activités actives ET ses
 * réunions (Meeting, en tant que participant). Retourne le premier conflit
 * trouvé, avec de quoi agir dessus (id de l'entrée ou lien de la réunion —
 * cahier de corrections UI/UX §14 : "Déplacer la réunion"/"Déplacer la
 * mission" doivent être des actions concrètes, pas un bouton générique).
 */
export async function findScheduleConflict(
  userId: string,
  dateDebut: Date,
  dateFin: Date,
  excludeEntryId?: string
): Promise<ScheduleConflict | null> {
  const [entry, meeting] = await Promise.all([
    prisma.personalPlanningEntry.findFirst({
      where: {
        userId,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
        statut: { notIn: ["TERMINEE", "ANNULEE"] },
        dateDebut: { lt: dateFin },
        dateFin: { gt: dateDebut },
      },
      select: { id: true, titre: true, dateDebut: true, dateFin: true },
    }),
    prisma.meeting.findFirst({
      where: {
        participants: { some: { userId } },
        // Meeting n'a qu'une dateHeure (pas de fin stockée) — un chevauchement
        // simple : sa date/heure tombe dans la plage testée.
        dateHeure: { gte: dateDebut, lt: dateFin },
      },
      select: { id: true, titre: true, dateHeure: true },
    }),
  ]);

  if (entry) return { titre: entry.titre, entryId: entry.id, meetingHref: null, dateDebut: entry.dateDebut, dateFin: entry.dateFin };
  if (meeting) {
    return {
      titre: meeting.titre,
      entryId: null,
      meetingHref: `/reunions/${meeting.id}`,
      dateDebut: meeting.dateHeure,
      dateFin: new Date(meeting.dateHeure.getTime() + MEETING_DEFAULT_DURATION_MINUTES * 60_000),
    };
  }
  return null;
}
