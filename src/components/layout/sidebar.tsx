"use client";

import { SidebarNav } from "./sidebar-nav";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";

/**
 * Sidebar desktop (refonte « façon Jira ») : panneau clair sous la barre
 * superieure, masque entierement (plutot que reduit en rail d'icones) via le
 * bouton de la topbar — meme cle localStorage, l'etat est partage par le hook.
 */
export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  const { collapsed } = useSidebarCollapsed("sidebar-collapsed");

  return (
    <aside
      aria-label="Navigation principale"
      aria-hidden={collapsed || undefined}
      inert={collapsed || undefined}
      className={cn(
        "show-desktop shrink-0 flex-col overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-0 border-r-0" : "w-[248px] border-r"
      )}
    >
      <div className="flex min-h-0 w-[248px] flex-1 flex-col">
        <SidebarNav permissions={permissions} roleKey={roleKey} />
      </div>
    </aside>
  );
}
