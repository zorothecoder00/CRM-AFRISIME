import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkScheduleForm } from "@/components/parametres/work-schedule-form";
import { WorkScheduleExceptions } from "@/components/parametres/work-schedule-exceptions";
import type { DayScheduleInput } from "@/lib/validations/user-work-schedule.schema";

const DEFAULT_ACTIVE_DAYS = new Set([1, 2, 3, 4, 5]); // lundi-vendredi

/** §40 : horaires de travail hebdomadaires — alimente computeDailyCapacity (§15) à la place du /5 uniforme quand configuré. */
export default async function ParametresHorairesPage() {
  const session = await getServerSession(authOptions);
  const [schedules, exceptions] = await Promise.all([
    prisma.userWorkSchedule.findMany({
      where: { userId: session!.user.id },
      include: { breaks: { orderBy: { ordre: "asc" } } },
      orderBy: [{ jourSemaine: "asc" }, { ordre: "asc" }],
    }),
    prisma.userWorkScheduleException.findMany({ where: { userId: session!.user.id }, orderBy: { date: "desc" } }),
  ]);
  const byDay = new Map<number, typeof schedules>();
  for (const s of schedules) {
    const list = byDay.get(s.jourSemaine) ?? [];
    list.push(s);
    byDay.set(s.jourSemaine, list);
  }

  const days: DayScheduleInput[] = Array.from({ length: 7 }, (_, jourSemaine) => {
    const existing = byDay.get(jourSemaine);
    if (existing && existing.length > 0) {
      return {
        jourSemaine,
        actif: true,
        type: existing[0].type,
        shifts: existing.map((s) => ({
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          breaks: s.breaks.map((b) => ({ heureDebut: b.heureDebut, heureFin: b.heureFin })),
        })),
      };
    }
    return {
      jourSemaine,
      actif: DEFAULT_ACTIVE_DAYS.has(jourSemaine),
      type: "NORMAL" as const,
      shifts: [{ heureDebut: "08:00", heureFin: "17:00", breaks: [] }],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horaires de travail</h1>
        <p className="text-sm text-muted-foreground">
          Configurez vos jours ouvrables, horaires et pauses — le moteur de planification connaît ainsi votre capacité
          réelle disponible pour calculer la charge journalière (§15) et éviter les conflits.
        </p>
      </div>

      <WorkScheduleForm initialDays={days} />

      <WorkScheduleExceptions
        exceptions={exceptions.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          type: e.type,
          heureDebut: e.heureDebut,
          heureFin: e.heureFin,
          motif: e.motif,
        }))}
      />
    </div>
  );
}
