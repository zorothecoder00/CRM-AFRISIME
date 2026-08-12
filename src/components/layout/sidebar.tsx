import { Workflow } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ permissions }: { permissions: string[] }) {
  return (
    <aside className="show-desktop w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/30">
          <Workflow className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold">AfriFlow</span>
      </div>
      <SidebarNav permissions={permissions} />
    </aside>
  );
}
