import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const canAccessAdministration = session.user.permissions.includes(
    PERMISSIONS.ADMINISTRATION_ACCESS
  );

  const [recentNotifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ]);

  return (
    <div className="flex h-screen">
      <Sidebar canAccessAdministration={canAccessAdministration} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
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
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
