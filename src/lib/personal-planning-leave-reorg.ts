import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { moveEntryToDate } from "@/lib/personal-planning-move";

const PLANNING_PATH = "/planning-personnel";

/**
 * §41 — quand un congé est approuvé, les activités déjà programmées pendant
 * la période sont déplacées juste après (heure/durée conservées), comme un
 * "reporter" ciblé (même mécanique que moveEntryToDate/reorganizeOverloadedDay).
 * Notifie l'approbateur uniquement si au moins une activité a dû bouger —
 * "Alerte manager si nécessaire" du §41, pas un bruit systématique.
 *
 * §46 — appelée uniquement depuis decideLeave (calendar.actions.ts), déjà
 * gardée par requirePermission(LEAVE_MANAGE) et par le `leave.userId`/
 * `leave.id` de l'enregistrement Leave qui vient d'être décidé (jamais un
 * id fourni tel quel par le client). Vit dans un lib plain (pas "use
 * server") précisément pour ne jamais devenir elle-même un endpoint
 * invocable avec un `userId` arbitraire — voir personal-planning-move.ts.
 */
export async function reorganizeEntriesForApprovedLeave(
  leaveId: string,
  userId: string,
  leaveDateDebut: Date,
  leaveDateFin: Date,
  approverId: string
) {
  const overlapping = await prisma.personalPlanningEntry.findMany({
    where: {
      userId,
      type: { not: "RESERVE" },
      statut: { notIn: ["TERMINEE", "ANNULEE"] },
      dateDebut: { lt: leaveDateFin },
      dateFin: { gt: leaveDateDebut },
    },
    select: { id: true, titre: true, dateDebut: true },
  });

  if (overlapping.length === 0) return { moved: 0 };

  await prisma.$transaction(async (tx) => {
    for (const entry of overlapping) {
      const newDateDebut = new Date(leaveDateFin);
      newDateDebut.setDate(newDateDebut.getDate() + 1);
      newDateDebut.setHours(entry.dateDebut.getHours(), entry.dateDebut.getMinutes(), 0, 0);
      await moveEntryToDate(tx, entry.id, newDateDebut);
    }
  });

  await createNotification({
    userId: approverId,
    type: "CONGE_REORGANISATION",
    titre: `${overlapping.length} activité(s) reprogrammée(s) suite à un congé approuvé.`,
    lien: PLANNING_PATH,
    entityType: "Leave",
    entityId: leaveId,
  });

  return { moved: overlapping.length };
}
