"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PersonalPlanningSidebarNav } from "./personal-planning-sidebar-nav";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";
import type { NotificationPreview } from "@/components/notifications/notification-bell";

/**
 * Sidebar dédiée au module Planning personnel — remplace entièrement la
 * sidebar globale de l'application sur ces pages (refonte design demandée).
 */
export function PersonalPlanningSidebar({
  aPlanifierCount,
  alertesCount,
  permissions,
  notifications,
}: {
  aPlanifierCount: number;
  alertesCount: number;
  permissions: string[];
  notifications: NotificationPreview[];
}) {
  const { collapsed, toggle } = useSidebarCollapsed("personal-planning-sidebar-collapsed");

  return (
    <aside
      className={cn(
        "show-desktop relative z-10 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
        className="absolute -right-3 top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      <div className={cn("flex h-14 shrink-0 items-center overflow-hidden border-b px-3", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <BrandMark className="[&>span:last-child]:hidden" />
        ) : (
          <BrandMark />
        )}
      </div>
      <PersonalPlanningSidebarNav
        aPlanifierCount={aPlanifierCount}
        alertesCount={alertesCount}
        permissions={permissions}
        collapsed={collapsed}
        notifications={notifications}
      />
    </aside>
  );
}
