"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PERSONAL_PLANNING_NAV_GROUPS,
  PERSONAL_PLANNING_HOME_ITEM,
  type PersonalPlanningNavItem,
} from "./personal-planning-nav";

/** Contenu de navigation partagé entre la sidebar desktop et le tiroir mobile du module Planning personnel. */
export function PersonalPlanningSidebarNav({
  aPlanifierCount,
  alertesCount,
  permissions,
  onNavigate,
}: {
  aPlanifierCount: number;
  alertesCount: number;
  permissions: string[];
  onNavigate?: () => void;
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

  function renderItem(item: PersonalPlanningNavItem) {
    const active = isActive(item.href);
    const Icon = item.icon;
    const count = badgeFor(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]",
          active
            ? "bg-gradient-to-b from-sidebar-accent to-sidebar-accent/70 text-sidebar-accent-foreground shadow-[0_3px_10px_-2px_rgba(0,0,0,0.4)] ring-1 ring-white/10 before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-white/25 before:content-['']"
            : "text-sidebar-foreground/70 hover:-translate-y-0.5 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
            active ? "bg-black/20 text-sidebar-primary shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate">{item.label}</span>
        {count > 0 && (
          <span className="ml-auto rounded-full bg-sidebar-primary/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </Link>
    );
  }

  const visibleGroups = PERSONAL_PLANNING_NAV_GROUPS.filter(
    (group) => group.items.length > 0 && (!group.permission || permissions.includes(group.permission))
  );

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3">
      <div className="space-y-1">{renderItem(PERSONAL_PLANNING_HOME_ITEM)}</div>
      {visibleGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-primary uppercase">{group.title}</div>
          {group.items.map(renderItem)}
        </div>
      ))}
    </nav>
  );
}
