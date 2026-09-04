"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  saveWorkScheduleSchema,
  createWorkScheduleExceptionSchema,
  type SaveWorkScheduleInput,
  type CreateWorkScheduleExceptionInput,
} from "@/lib/validations/user-work-schedule.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * §40 — enregistre l'horaire hebdomadaire de l'utilisateur : un jour peut
 * désormais porter plusieurs horaires (shifts, ordre 0..n), chacun avec ses
 * propres pauses (demande utilisateur). Plus simple qu'un diff ligne à ligne
 * vu le nombre variable de shifts : on repart de zéro pour chaque jour
 * (delete cascade ses pauses) puis recrée ce qui est actif. Un jour
 * "inactif" (actif=false, ex. dimanche par défaut) reste simplement
 * supprimé : l'absence de ligne pour un jour vaut "non travaillé" pour
 * computeDailyCapacity, pas besoin de la stocker.
 */
export async function saveWorkSchedule(input: SaveWorkScheduleInput) {
  const session = await requireSession();
  const data = saveWorkScheduleSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    for (const day of data.days) {
      await tx.userWorkSchedule.deleteMany({ where: { userId: session.user.id, jourSemaine: day.jourSemaine } });
      if (!day.actif) continue;

      for (let ordre = 0; ordre < day.shifts.length; ordre++) {
        const shift = day.shifts[ordre];
        await tx.userWorkSchedule.create({
          data: {
            userId: session.user.id,
            jourSemaine: day.jourSemaine,
            ordre,
            heureDebut: shift.heureDebut,
            heureFin: shift.heureFin,
            type: day.type,
            breaks: {
              create: shift.breaks.map((b, breakOrdre) => ({
                heureDebut: b.heureDebut,
                heureFin: b.heureFin,
                ordre: breakOrdre,
              })),
            },
          },
        });
      }
    }
  });

  revalidatePath("/parametres/horaires");
  // "layout" (pas "page") : /planning-personnel/layout.tsx enveloppe tout le
  // sous-arbre (hub, ma-journee, equipe/[userId]...) — sans ça, les vues
  // Jour/Semaine restaient périmées après un changement d'horaires (demande
  // utilisateur — la grille doit refléter les nouvelles heures aussitôt).
  revalidatePath("/planning-personnel", "layout");
  return { ok: true };
}

function truncateToDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** §39 — ajoute (ou remplace, upsert) une dérogation ponctuelle à une date précise. */
export async function createWorkScheduleException(input: CreateWorkScheduleExceptionInput) {
  const session = await requireSession();
  const data = createWorkScheduleExceptionSchema.parse(input);
  const date = truncateToDay(data.date);

  const exception = await prisma.userWorkScheduleException.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: {
      type: data.type,
      heureDebut: data.type === "ABSENCE" ? null : data.heureDebut || null,
      heureFin: data.type === "ABSENCE" ? null : data.heureFin || null,
      pauseDebut: data.pauseDebut || null,
      pauseFin: data.pauseFin || null,
      motif: data.motif || null,
    },
    create: {
      userId: session.user.id,
      date,
      type: data.type,
      heureDebut: data.type === "ABSENCE" ? null : data.heureDebut || null,
      heureFin: data.type === "ABSENCE" ? null : data.heureFin || null,
      pauseDebut: data.pauseDebut || null,
      pauseFin: data.pauseFin || null,
      motif: data.motif || null,
    },
  });

  revalidatePath("/parametres/horaires");
  return { id: exception.id };
}

export async function deleteWorkScheduleException(exceptionId: string) {
  const session = await requireSession();

  const existing = await prisma.userWorkScheduleException.findUniqueOrThrow({ where: { id: exceptionId } });
  if (existing.userId !== session.user.id) {
    throw new Error("Vous ne pouvez supprimer que vos propres dérogations.");
  }

  await prisma.userWorkScheduleException.delete({ where: { id: exceptionId } });
  revalidatePath("/parametres/horaires");
}
