import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  return (
    <div className="flex h-screen">
      <Sidebar canAccessAdministration={canAccessAdministration} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={session.user.name ?? session.user.email ?? ""} roleLabel={session.user.roleLabel} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
