"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PERSONAL_PLANNING_NAV_GROUPS,
  PERSONAL_PLANNING_HOME_ITEM,
  type PersonalPlanningNavItem,
} from "./personal-planning-nav";
import { NotificationsSheet } from "@/components/notifications/notifications-sheet";
import type { NotificationPreview } from "@/components/notifications/notification-bell";

/** Contenu de navigation partagé entre la sidebar desktop et le tiroir mobile du module Planning personnel. */
export function PersonalPlanningSidebarNav({
  aPlanifierCount,
  alertesCount,
  permissions,
  onNavigate,
  collapsed = false,
  notifications,
}: {
  aPlanifierCount: number;
  alertesCount: number;
  permissions: string[];
  onNavigate?: () => void;
  /** Mode replie (rail d'icones) — jamais force sur le tiroir mobile, qui reste toujours en toutes lettres. */
  collapsed?: boolean;
  /** Demande utilisateur — "Alertes" ouvre un panneau (NotificationsSheet) au lieu de naviguer vers /notifications, qui cassait la navigation fluide du module. */
  notifications: NotificationPreview[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(href: string) {
    if (href.includes("#")) return false;
    const [withoutHash] = href.split("#");
    const [path, query] = withoutHash.split("?");
    if (pathname !== path) {
      // Sous-route distincte (ex. /planning-personnel/missions) uniquement —
      // jamais pour le hub "/planning-personnel" lui-même, partagé par
      // plusieurs items (Ma journée, Calendrier, Rendez-vous...) distingués
      // seulement par leur ?query : sinon ils s'allument tous ensemble dès
      // qu'on est sur une sous-page comme /planning-personnel/demandes.
      return path !== "/planning-personnel" && pathname.startsWith(path + "/");
    }
    if (!query) return searchParams.toString() === "";
    const target = new URLSearchParams(query);
    return [...target.entries()].every(([k, v]) => searchParams.get(k) === v);
  }

  function badgeFor(item: PersonalPlanningNavItem) {
    if (item.badgeKey === "aPlanifier") return aPlanifierCount;
    if (item.badgeKey === "alertes") return alertesCount;
    return 0;
  }

  function itemClassName(active: boolean) {
    return cn(
      "group relative flex min-h-8 w-full items-center gap-2.5 rounded-[4px] px-2 py-1 text-left text-sm transition-colors",
      collapsed && "justify-center px-0",
      active
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-sidebar-primary before:content-['']"
        : "text-sidebar-foreground hover:bg-hover hover:text-foreground active:bg-pressed"
    );
  }

  function itemContent(item: PersonalPlanningNavItem, count: number) {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <>
        <span
          className={cn(
            "relative flex h-6 w-6 shrink-0 items-center justify-center",
            active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {collapsed && count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sidebar-primary" />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
            {count > 0 && (
              <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-foreground tabular-nums">
                {count}
              </span>
            )}
          </>
        )}
      </>
    );
  }

  function renderItem(item: PersonalPlanningNavItem) {
    const count = badgeFor(item);

    // Demande utilisateur — "Alertes" ouvre un panneau latéral (les
    // notifications) plutôt que de naviguer vers /notifications, qui
    // sortait de la coquille dédiée du module (navigation pas fluide).
    if (item.badgeKey === "alertes") {
      return (
        <NotificationsSheet
          key={item.href}
          notifications={notifications}
          unreadCount={alertesCount}
          trigger={
            <button type="button" title={collapsed ? item.label : undefined} className={itemClassName(false)}>
              {itemContent(item, count)}
            </button>
          }
        />
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={itemClassName(isActive(item.href))}
      >
        {itemContent(item, count)}
      </Link>
    );
  }

  const visibleGroups = PERSONAL_PLANNING_NAV_GROUPS.filter(
    (group) => group.items.length > 0 && (!group.permission || permissions.includes(group.permission))
  );

  return (
    <nav className="thin-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
      <div className="space-y-1">{renderItem(PERSONAL_PLANNING_HOME_ITEM)}</div>
      {visibleGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          {!collapsed && (
            <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-primary uppercase">{group.title}</div>
          )}
          {group.items.map(renderItem)}
        </div>
      ))}
    </nav>
  );
}
