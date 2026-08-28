"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveWorkScheduleSchema, type SaveWorkScheduleInput } from "@/lib/validations/user-work-schedule.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * §40 — enregistre l'horaire hebdomadaire de l'utilisateur, une ligne par
 * jour (upsert sur la contrainte unique [userId, jourSemaine]). Un jour
 * "inactif" (actif=false, ex. dimanche par défaut) est simplement supprimé :
 * l'absence de ligne pour un jour vaut "non travaillé" pour
 * computeDailyCapacity, pas besoin de la stocker.
 */
export async function saveWorkSchedule(input: SaveWorkScheduleInput) {
  const session = await requireSession();
  const data = saveWorkScheduleSchema.parse(input);

  await prisma.$transaction([
    prisma.userWorkSchedule.deleteMany({ where: { userId: session.user.id, jourSemaine: { in: data.days.filter((d) => !d.actif).map((d) => d.jourSemaine) } } }),
    ...data.days
      .filter((d) => d.actif)
      .map((d) =>
        prisma.userWorkSchedule.upsert({
          where: { userId_jourSemaine: { userId: session.user.id, jourSemaine: d.jourSemaine } },
          update: {
            heureDebut: d.heureDebut,
            heureFin: d.heureFin,
            pauseDebut: d.pauseDebut || null,
            pauseFin: d.pauseFin || null,
            type: d.type,
            actif: true,
          },
          create: {
            userId: session.user.id,
            jourSemaine: d.jourSemaine,
            heureDebut: d.heureDebut,
            heureFin: d.heureFin,
            pauseDebut: d.pauseDebut || null,
            pauseFin: d.pauseFin || null,
            type: d.type,
          },
        })
      ),
  ]);

  revalidatePath("/parametres/horaires");
  return { ok: true };
}
