"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NAV_GROUPS, getContextualNavItems, type NavItem } from "./nav-config";

const SIDEBAR_OPEN_GROUPS_KEY = "sidebar-open-groups";
const SIDEBAR_OPEN_GROUPS_EVENT = "sidebar-open-groups-change";

// "Administration" fusionne desormais ~47 items (ex-groupes Gouvernance & Risques,
// Pilotage, etc. — voir nav-config.ts) : replie par defaut pour ne pas allonger
// la sidebar, les autres groupes (courts) restent ouverts par defaut.
function defaultOpenGroups(): Record<string, boolean> {
  return Object.fromEntries(NAV_GROUPS.map((g) => [g.labelKey, g.labelKey !== "administration"]));
}

// Snapshot memoise (cle brute -> objet parse) : useSyncExternalStore exige une
// reference stable tant que la donnee source n'a pas change, sinon re-render
// en boucle. localStorage.setItem ne declenche pas l'evenement "storage" dans
// le meme onglet, d'ou l'evenement custom dispatch par toggleGroup ci-dessous.
const SERVER_SNAPSHOT = defaultOpenGroups();
let cachedRaw: string | null | undefined;
let cachedSnapshot: Record<string, boolean> = SERVER_SNAPSHOT;

function readStoredOpenGroups(): Record<string, boolean> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SIDEBAR_OPEN_GROUPS_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSnapshot = raw ? { ...defaultOpenGroups(), ...JSON.parse(raw) } : defaultOpenGroups();
    } catch {
      cachedSnapshot = defaultOpenGroups();
    }
  }
  return cachedSnapshot;
}

function subscribeOpenGroups(callback: () => void) {
  window.addEventListener(SIDEBAR_OPEN_GROUPS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIDEBAR_OPEN_GROUPS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Contenu de navigation partagé entre la sidebar desktop et le tiroir mobile. */
export function SidebarNav({
  permissions,
  roleKey,
  onNavigate,
  className,
  collapsed = false,
}: {
  permissions: string[];
  roleKey?: string;
  onNavigate?: () => void;
  className?: string;
  /** Mode replie (rail d'icones) — jamais force sur le tiroir mobile, qui reste toujours en toutes lettres. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const contextualItems = getContextualNavItems(roleKey, permissions);
  const openGroups = useSyncExternalStore(subscribeOpenGroups, readStoredOpenGroups, () => SERVER_SNAPSHOT);

  function toggleGroup(labelKey: string) {
    const current = readStoredOpenGroups();
    const next = { ...current, [labelKey]: !(current[labelKey] ?? true) };
    try {
      localStorage.setItem(SIDEBAR_OPEN_GROUPS_KEY, JSON.stringify(next));
    } catch {
      // localStorage indisponible (navigation privee...) : le repli reste local a ce rendu.
    }
    window.dispatchEvent(new Event(SIDEBAR_OPEN_GROUPS_EVENT));
  }

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    const title = t(`items.${item.titleKey}`);

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/30",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? title : t("moduleAVenir")}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            <Icon className="h-4 w-4" />
          </span>
          {!collapsed && title}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? title : undefined}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-gradient-to-b from-sidebar-accent to-sidebar-accent/70 text-sidebar-accent-foreground shadow-[0_3px_10px_-2px_rgba(0,0,0,0.4)] ring-1 ring-white/10 before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-white/25 before:content-['']"
            : "text-sidebar-foreground/70 hover:-translate-y-0.5 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3)]"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
            isActive
              ? "bg-black/20 text-sidebar-primary shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
              : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {!collapsed && title}
      </Link>
    );
  }

  return (
    <nav className={cn("flex-1 space-y-5 overflow-y-auto p-3", className)}>
      {contextualItems.length > 0 && (
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-primary uppercase">{t("pourVous")}</div>
          )}
          {contextualItems.map(renderItem)}
        </div>
      )}
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.permission || permissions.includes(item.permission));
        if (items.length === 0) return null;

        // Rail d'icones (sidebar repliee) : pas d'en-tete cliquable possible, on affiche tout a plat.
        if (collapsed) {
          return (
            <div key={group.labelKey} className="space-y-1">
              {items.map(renderItem)}
            </div>
          );
        }

        const isOpen = openGroups[group.labelKey] ?? true;

        return (
          <Collapsible key={group.labelKey} open={isOpen} onOpenChange={() => toggleGroup(group.labelKey)} className="space-y-1">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-1 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase transition-colors hover:text-sidebar-foreground/80">
              <span>{t(`groups.${group.labelKey}`)}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", !isOpen && "-rotate-90")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">{items.map(renderItem)}</CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}
