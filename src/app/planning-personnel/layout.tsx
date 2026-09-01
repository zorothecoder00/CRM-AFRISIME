import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanningSidebar } from "@/components/personal-planning/layout/personal-planning-sidebar";
import { PersonalPlanningTopbar } from "@/components/personal-planning/layout/personal-planning-topbar";

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

  const [recentNotifications, unreadCount, aPlanifierCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    // §13 — même critère que l'inbox "À planifier" de la page principale.
    prisma.task.count({
      where: {
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        dateDebut: null,
        personalPlanningEntries: { none: {} },
      },
    }),
  ]);

  return (
    <div className="flex h-screen">
      <PersonalPlanningSidebar aPlanifierCount={aPlanifierCount} alertesCount={unreadCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PersonalPlanningTopbar
          userName={session.user.name ?? session.user.email ?? ""}
          userImage={session.user.image}
          roleLabel={session.user.roleLabel}
          notifications={recentNotifications.map((n) => ({
            id: n.id,
            titre: n.titre,
            lien: n.lien,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
          }))}
          unreadCount={unreadCount}
          aPlanifierCount={aPlanifierCount}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
