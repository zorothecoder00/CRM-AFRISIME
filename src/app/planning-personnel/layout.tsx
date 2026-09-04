import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { PersonalPlanningSidebar } from "@/components/personal-planning/layout/personal-planning-sidebar";
import { PersonalPlanningTopbar } from "@/components/personal-planning/layout/personal-planning-topbar";
import { PersonalPlanningToolbar } from "@/components/personal-planning/layout/personal-planning-toolbar";
import { PersonalPlanningBackLink } from "@/components/personal-planning/layout/personal-planning-back-link";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";

/**
 * Layout dédié au module Planning personnel (refonte design) : sort ce
 * module de la sidebar/topbar globales de l'application (voir
 * src/app/(app)/layout.tsx) au profit d'une navigation propre au module,
 * fidèle à la maquette fournie. Placé hors du groupe (app) pour ne pas
 * hériter de son layout, sans changer l'URL /planning-personnel.
 */
export default async function PlanningPersonnelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  if (session.revoked) {
    redirect("/login");
  }

  const userId = session.user.id;
  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [recentNotifications, unreadCount, aPlanifierCount, colleagues, projects, tasks, objectives] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      // Demande utilisateur — panneau NotificationsSheet (sidebar "Alertes")
      // en veut plus que l'aperçu de 5 du clochon du topbar.
      take: 30,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    // §13 — même critère que l'inbox "À planifier" de la page principale.
    prisma.task.count({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        personalPlanningEntries: { none: {} },
        deletedAt: null,
      },
    }),
    // Barre d'outils commune (prototype V2) — mêmes données de référence que
    // le hub, nécessaires pour "Nouvelle activité"/"Nouvelle réunion"/
    // "Demander un créneau" quel que soit le sous-menu affiché.
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, sections: { select: { id: true, nom: true } } },
    }),
    prisma.task.findMany({
      where: { OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }] },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true, projectId: true },
    }),
    prisma.objective.findMany({ where: { userId }, orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
  ]);

  const colleagueOptions = colleagues.map((c) => ({ id: c.id, label: c.name }));
  const toolbarRefData: PersonalPlanningReferenceData = { colleagues: colleagueOptions, projects, tasks, objectives };
  const notificationRows = recentNotifications.map((n) => ({
    id: n.id,
    titre: n.titre,
    lien: n.lien,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    type: n.type,
  }));

  return (
    <div className="flex h-screen">
      <PersonalPlanningSidebar
        aPlanifierCount={aPlanifierCount}
        alertesCount={unreadCount}
        permissions={session.user.permissions}
        notifications={notificationRows}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PersonalPlanningTopbar
          userName={session.user.name ?? session.user.email ?? ""}
          userImage={session.user.image}
          roleLabel={session.user.roleLabel}
          dateLabel={dateLabel}
          notifications={notificationRows.slice(0, 5)}
          sidebarNotifications={notificationRows}
          unreadCount={unreadCount}
          aPlanifierCount={aPlanifierCount}
          permissions={session.user.permissions}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-4">
            <PersonalPlanningBackLink />
            <PersonalPlanningToolbar
              refData={toolbarRefData}
              meetingProjects={projects.map((p) => ({ id: p.id, label: p.nom }))}
              colleagues={colleagueOptions}
              canCreateMeeting={session.user.permissions.includes(PERMISSIONS.MEETING_CREATE)}
              todayKey={format(new Date(), "yyyy-MM-dd")}
            />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
