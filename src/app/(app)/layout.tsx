import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  // Session revoquee par un admin (V2.2 §36) — force la reconnexion.
  if (session.revoked) {
    redirect("/login");
  }

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
      <Sidebar permissions={session.user.permissions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={session.user.name ?? session.user.email ?? ""}
          userImage={session.user.image}
          roleLabel={session.user.roleLabel}
          permissions={session.user.permissions}
          notifications={recentNotifications.map((n) => ({
            id: n.id,
            titre: n.titre,
            lien: n.lien,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString(),
          }))}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
