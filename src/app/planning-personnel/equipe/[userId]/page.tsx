import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval, startOfDay, endOfDay, format } from "date-fns";
import { fr } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePersonalPlanningAccess, hasAgendaEditPermission } from "@/lib/personal-planning-access";
import { PersonalPlanningWeek, type PersonalPlanningDay } from "@/components/personal-planning/personal-planning-week";
import { meetingToEntryRow } from "@/lib/personal-planning-meetings";
import { toPersonalPlanningEntryRow, TACHE_DEPENDENCIES_SELECT } from "@/lib/personal-planning-rows";
import { findNonWorkingDaysInRange } from "@/lib/personal-planning-holidays";
import { groupSchedulesByWeekday } from "@/lib/personal-planning-workload";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { Lock, Pencil, ChevronLeft } from "lucide-react";

/**
 * §46 — vue manager sur le planning personnel détaillé d'un subordonné
 * (accès direct hiérarchique ou chef d'équipe, voir `canViewPersonalPlanningOf`).
 * Volontairement minimale par rapport à `/planning-personnel` : une seule
 * vue (Semaine), en lecture seule, pas d'inbox ni de demandes — un simple
 * coup d'œil, pas un second poste de pilotage du planning d'autrui.
 */
export default async function SubordinatePersonalPlanningPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: targetUserId } = await params;
  const session = await getServerSession(authOptions);
  const accessReason = await resolvePersonalPlanningAccess(session!.user.id, targetUserId);
  if (!accessReason) redirect("/dashboard");

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } });
  if (!target) notFound();

  // Demande utilisateur — un partage d'agenda peut être en édition
  // (EDITEUR) : donne alors la main pour ajouter/modifier des activités
  // sur CET agenda, contrairement à manager/chef d'équipe qui restent en
  // lecture seule (voir hasAgendaEditPermission).
  const canEdit = await hasAgendaEditPermission(targetUserId, session!.user.id);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [entriesRaw, meetingsRaw] = await Promise.all([
    prisma.personalPlanningEntry.findMany({
      where: { userId: targetUserId, dateDebut: { lte: weekEnd }, dateFin: { gte: weekStart } },
      include: {
        tache: { select: { titre: true, projectId: true, ...TACHE_DEPENDENCIES_SELECT } },
        projet: { select: { nom: true } },
        participants: { select: { userId: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.meeting.findMany({
      where: { participants: { some: { userId: targetUserId } }, dateHeure: { gte: weekStart, lte: weekEnd } },
      select: { id: true, titre: true, dateHeure: true, lieu: true, statut: true },
    }),
  ]);

  // Donnees de reference pour "Nouvelle activite" — scopees au PROPRIETAIRE
  // (targetUserId), pas a l'editeur qui consulte : ses propres projets/
  // taches/collegues n'ont pas de sens ici. Inutile si lecture seule.
  const refData: PersonalPlanningReferenceData = canEdit
    ? await (async () => {
        const [colleagues, projects, tasks, objectives] = await Promise.all([
          prisma.user.findMany({ where: { isActive: true, id: { not: targetUserId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
          prisma.project.findMany({ where: { members: { some: { userId: targetUserId } } }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
          prisma.task.findMany({
            where: { OR: [{ responsablePrincipalId: targetUserId }, { assignees: { some: { userId: targetUserId } } }] },
            orderBy: { titre: "asc" },
            select: { id: true, titre: true, projectId: true },
          }),
          prisma.objective.findMany({ where: { userId: targetUserId }, orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
        ]);
        return {
          colleagues: colleagues.map((c) => ({ id: c.id, label: c.name })),
          projects,
          tasks,
          objectives,
        };
      })()
    : { colleagues: [], projects: [], tasks: [], objectives: [] };

  const entries = [
    ...entriesRaw.map((e) => toPersonalPlanningEntryRow(e, new Map())),
    ...meetingsRaw.map(meetingToEntryRow),
  ];

  // §39 — jours fériés/non ouvrables du SUBORDONNÉ (pas du manager qui consulte).
  const nonWorkingMap = await findNonWorkingDaysInRange(targetUserId, weekStart, weekEnd);

  // Demande utilisateur — horaires de travail du SUBORDONNÉ, pour que la
  // grille se cale dessus (voir scheduleBoundsForDay côté PersonalPlanningWeek).
  const scheduleRows = await prisma.userWorkSchedule.findMany({
    where: { userId: targetUserId },
    include: { breaks: { orderBy: { ordre: "asc" } } },
    orderBy: { ordre: "asc" },
  });
  const schedulesByWeekday = groupSchedulesByWeekday(scheduleRows);

  const days: PersonalPlanningDay[] = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => ({
    key: day.toISOString(),
    dateKey: format(day, "yyyy-MM-dd"),
    label: format(day, "EEEE d", { locale: fr }),
    isToday: isSameDay(day, now),
    entries: entries
      .filter((e) => isWithinInterval(day, { start: startOfDay(new Date(e.dateDebut)), end: endOfDay(new Date(e.dateFin)) }))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
    nonWorkingReason: nonWorkingMap.get(format(day, "yyyy-MM-dd")) ?? null,
    schedule: schedulesByWeekday.get(day.getDay()) ?? null,
  }));

  return (
    <div className="space-y-4">
      <Link href={`/pilotage/utilisateur/${targetUserId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {canEdit ? <Pencil className="size-6 text-muted-foreground" /> : <Lock className="size-6 text-muted-foreground" />}
          <div>
            <h1 className="text-2xl font-semibold">Planning personnel de {target.name}</h1>
            <p className="text-sm text-muted-foreground">
              {canEdit ? "Vue en édition" : "Vue en lecture seule"} — visible car{" "}
              {accessReason === "manager" && "vous êtes son manager"}
              {accessReason === "chef_equipe" && "vous êtes chef de son équipe"}
              {accessReason === "partage" && "cette personne a partagé son agenda avec vous"}
              {accessReason === "self" && "il s'agit de votre propre planning"}.
            </p>
          </div>
        </div>
        {canEdit && (
          <PersonalPlanningEntryFormDialog
            refData={refData}
            defaultValues={{ onBehalfOfUserId: targetUserId }}
            triggerLabel="Nouvelle activité"
            dialogTitle={`Nouvelle activité pour ${target.name}`}
          />
        )}
      </div>

      <PersonalPlanningWeek days={days} readOnly={!canEdit} />
    </div>
  );
}
