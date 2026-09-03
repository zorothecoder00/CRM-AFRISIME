import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkScheduleForm } from "@/components/parametres/work-schedule-form";
import { WorkScheduleExceptions } from "@/components/parametres/work-schedule-exceptions";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import type { DayScheduleInput } from "@/lib/validations/user-work-schedule.schema";

const DEFAULT_ACTIVE_DAYS = new Set([1, 2, 3, 4, 5]); // lundi-vendredi

/**
 * "Paramètres" (prototype V2) — la version générale pointait par erreur vers
 * /parametres/profil (nom/e-mail/photo, sans rapport). Le prototype demande
 * Fuseau horaire / Premier jour de la semaine / Horaires flexibles /
 * Notifications : les deux derniers existent déjà, en mieux, sur des pages
 * dédiées (/parametres/horaires, /parametres/notifications) — regroupées
 * ici en une seule page plutôt que dupliquées. Fuseau horaire/premier jour
 * n'existent nulle part dans l'appli (nécessiteraient un champ User + une
 * migration) — hors périmètre de cette correction, laissés de côté.
 */
export default async function PersonalPlanningParametresPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [schedules, exceptions, user] = await Promise.all([
    prisma.userWorkSchedule.findMany({
      where: { userId },
      include: { breaks: { orderBy: { ordre: "asc" } } },
      orderBy: [{ jourSemaine: "asc" }, { ordre: "asc" }],
    }),
    prisma.userWorkScheduleException.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true, notificationChannelsPreferred: true } }),
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
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Horaires de travail et notifications de planning.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horaires de travail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesForm initialChannels={user.notificationChannelsPreferred} hasPhone={!!user.phone} />
        </CardContent>
      </Card>
    </div>
  );
}
