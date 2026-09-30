import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { countPendingAdminRequestApprovals } from "@/lib/admin-request-workflow";
import { countUnreadMessages } from "@/lib/unread-messages";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }
  // Session revoquee par un admin (V2.2 §36) — force la reconnexion.
  if (session.revoked) {
    redirect("/login");
  }

  const [recentNotifications, unreadCount, pendingRequestsCount, unreadMessagesCount, pendingCourriersCount] =
    await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
      session.user.permissions.includes(PERMISSIONS.ADMIN_REQUEST_VALIDATE)
        ? countPendingAdminRequestApprovals(session.user.roleKey)
        : Promise.resolve(0),
      session.user.permissions.includes(PERMISSIONS.MESSAGE_READ)
        ? countUnreadMessages(session.user.id)
        : Promise.resolve(0),
      session.user.permissions.includes(PERMISSIONS.COURRIER_READ)
        ? prisma.courrier.count({
            where: { responsableId: session.user.id, statut: { in: ["A_TRAITER", "EN_COURS"] } },
          })
        : Promise.resolve(0),
    ]);

  return (
    <div className="flex h-screen">
      <Sidebar permissions={session.user.permissions} roleKey={session.user.roleKey} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={session.user.name ?? session.user.email ?? ""}
          userImage={session.user.image}
          roleLabel={session.user.roleLabel}
          roleKey={session.user.roleKey}
          permissions={session.user.permissions}
          notifications={recentNotifications.map((n) => ({
            id: n.id,
            titre: n.titre,
            lien: n.lien,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
            type: n.type,
          }))}
          unreadCount={unreadCount}
          pendingRequestsCount={pendingRequestsCount}
          unreadMessagesCount={unreadMessagesCount}
          pendingCourriersCount={pendingCourriersCount}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
