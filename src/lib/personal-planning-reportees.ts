import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

/**
 * §22/§43 — nombre d'activités "reportées" aujourd'hui : déplacées (§47
 * logAudit, action "personal_planning_entry.moved") depuis une date qui
 * tombait aujourd'hui vers une date qui ne tombe plus aujourd'hui.
 * Partagé entre le bilan de fin de journée (/planning-personnel) et le
 * critère "tâches reportées" du score Planning Health (§43).
 */
export async function countReporteesToday(userId: string, now: Date): Promise<number> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const movedTodayLogs = await prisma.auditLog.findMany({
    where: { userId, entityType: "PersonalPlanningEntry", action: "personal_planning_entry.moved", createdAt: { gte: todayStart, lte: todayEnd } },
    select: { entityId: true, changes: true },
  });

  return new Set(
    movedTodayLogs
      .filter((log) => {
        const changes = log.changes as { dateDebut?: { avant?: string; apres?: string } } | null;
        const avant = changes?.dateDebut?.avant ? new Date(changes.dateDebut.avant) : null;
        const apres = changes?.dateDebut?.apres ? new Date(changes.dateDebut.apres) : null;
        if (!avant || !apres) return false;
        const avantEtaitAujourdhui = avant >= todayStart && avant <= todayEnd;
        const apresEstAujourdhui = apres >= todayStart && apres <= todayEnd;
        return avantEtaitAujourdhui && !apresEstAujourdhui;
      })
      .map((log) => log.entityId)
  ).size;
}
