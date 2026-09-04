"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PersonalPlanningSidebarNav } from "./personal-planning-sidebar-nav";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
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
        "show-desktop relative z-10 flex flex-col border-r bg-sidebar text-sidebar-foreground shadow-[6px_0_24px_-12px_rgba(0,0,0,0.5)] transition-[width] duration-200",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
        className="absolute -right-3 top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      <div className="flex flex-col items-center overflow-hidden border-b bg-amber-100 px-4 py-0">
        <Image
          src="/logo.png"
          alt="AfriSime Work Space"
          width={240}
          height={160}
          className={cn("w-auto transition-all duration-200", collapsed ? "h-9" : "h-32")}
          priority
        />
      </div>
      <PersonalPlanningSidebarNav
        aPlanifierCount={aPlanifierCount}
        alertesCount={alertesCount}
        permissions={permissions}
        collapsed={collapsed}
        notifications={notifications}
      />
      {!collapsed && (
        <div className="border-t p-3 text-[10px] leading-relaxed text-sidebar-foreground/40">
          Planifier · Collaborer · Exécuter · Contrôler
        </div>
      )}
    </aside>
  );
}
