"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight, Clock3, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ALL_NAV_ITEMS,
  DEFAULT_OPEN_GROUPS,
  NAV_GROUPS,
  NAV_PRIMARY,
  findNavLocation,
  getContextualNavItems,
  type NavItem,
} from "./nav-config";
import { pushRecent, useFavorites, useRecents } from "./nav-prefs";

const SIDEBAR_OPEN_GROUPS_KEY = "sidebar-open-groups-v2";
const SIDEBAR_OPEN_GROUPS_EVENT = "sidebar-open-groups-change";

// Sections speciales (Recents / Favoris) stockees dans la meme table que les
// espaces, sous des cles qui ne peuvent pas entrer en collision avec un labelKey.
const RECENTS_SECTION = "__recents";
const FAVORITES_SECTION = "__favoris";
const CONTEXT_SECTION = "__contexte";

function defaultOpenGroups(): Record<string, boolean> {
  return {
    ...Object.fromEntries(NAV_GROUPS.map((g) => [g.labelKey, DEFAULT_OPEN_GROUPS.includes(g.labelKey)])),
    [RECENTS_SECTION]: true,
    [FAVORITES_SECTION]: true,
    [CONTEXT_SECTION]: false,
  };
}

// Snapshot memoise (cle brute -> objet parse) : useSyncExternalStore exige une
// reference stable tant que la donnee source n'a pas change.
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

function toggleGroup(key: string) {
  const current = readStoredOpenGroups();
  const next = { ...current, [key]: !current[key] };
  try {
    localStorage.setItem(SIDEBAR_OPEN_GROUPS_KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponible : le repli n'est simplement pas memorise.
  }
  window.dispatchEvent(new Event(SIDEBAR_OPEN_GROUPS_EVENT));
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function SectionHeader({ label, isOpen, count }: { label: string; isOpen: boolean; count?: number }) {
  return (
    <CollapsibleTrigger className="group/hdr flex h-7 w-full items-center gap-1.5 rounded-[4px] px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-hover hover:text-foreground">
      <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-150", isOpen && "rotate-90")} />
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className="ml-auto text-[11px] font-normal tabular-nums opacity-0 transition-opacity group-hover/hdr:opacity-100">
          {count}
        </span>
      )}
    </CollapsibleTrigger>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1.5 pl-7 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

/**
 * Navigation partagee entre la sidebar desktop et le tiroir mobile —
 * organisation « façon Jira » : entrees de premier niveau, puis Recents et
 * Favoris (memorises par navigateur), puis les espaces metier repliables.
 */
export function SidebarNav({
  permissions,
  roleKey,
  onNavigate,
  className,
}: {
  permissions: string[];
  roleKey?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const openGroups = useSyncExternalStore(subscribeOpenGroups, readStoredOpenGroups, () => SERVER_SNAPSHOT);
  const { favorites, toggleFavorite } = useFavorites();
  const recents = useRecents();

  // Historique « Recents » : chaque page d'un module connu est memorisee.
  useEffect(() => {
    const location = findNavLocation(pathname);
    if (location) pushRecent(location.item.href);
  }, [pathname]);

  const canSee = (item: NavItem) => !item.permission || permissions.includes(item.permission);
  const byHref = (href: string) => ALL_NAV_ITEMS.find((item) => item.href === href);
  // Lien le plus specifique pour la page courante (ex. /crm/pipeline ne doit
  // pas aussi allumer /crm).
  const activeHref = findNavLocation(pathname)?.item.href;

  const contextualItems = getContextualNavItems(roleKey, permissions);
  const favoriteItems = favorites.map(byHref).filter((i): i is NavItem => !!i && canSee(i));
  const recentItems = recents
    .map(byHref)
    .filter((i): i is NavItem => !!i && canSee(i))
    .slice(0, 5);

  function renderItem(item: NavItem, keyPrefix = "") {
    const isActive = item.href === activeHref || (activeHref === undefined && isPathActive(pathname, item.href));
    const Icon = item.icon;
    const title = t(`items.${item.titleKey}`);
    const isFavorite = favorites.includes(item.href);

    if (item.disabled) {
      return (
        <div
          key={keyPrefix + item.href}
          className="flex h-8 items-center gap-2.5 rounded-[4px] px-2 text-sm text-sidebar-foreground/40"
          title={t("moduleAVenir")}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
      );
    }

    return (
      <div key={keyPrefix + item.href} className="group/item relative">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex h-8 items-center gap-2.5 rounded-[4px] pr-8 pl-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isActive
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-sidebar-primary before:content-['']"
              : "text-sidebar-foreground hover:bg-hover hover:text-foreground active:bg-pressed"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{title}</span>
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(item.href)}
          aria-label={isFavorite ? t("retirerFavori") : t("ajouterFavori")}
          title={isFavorite ? t("retirerFavori") : t("ajouterFavori")}
          className={cn(
            "absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[3px] text-muted-foreground transition-opacity hover:bg-pressed hover:text-foreground focus-visible:opacity-100",
            isFavorite ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-[#e2b203] text-[#e2b203]")} />
        </button>
      </div>
    );
  }

  return (
    <nav className={cn("thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3", className)}>
      <div className="space-y-0.5">{NAV_PRIMARY.filter(canSee).map((item) => renderItem(item, "primary-"))}</div>

      <div className="mt-3 space-y-0.5">
        <Collapsible open={!!openGroups[RECENTS_SECTION]} onOpenChange={() => toggleGroup(RECENTS_SECTION)}>
          <SectionHeader isOpen={!!openGroups[RECENTS_SECTION]} label={t("recents")} />
          <CollapsibleContent className="space-y-0.5 pt-0.5">
            {recentItems.length > 0 ? (
              recentItems.map((item) => renderItem(item, "recent-"))
            ) : (
              <EmptyHint>
                <Clock3 className="mr-1 inline h-3 w-3 align-[-2px]" />
                {t("recentsVide")}
              </EmptyHint>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={!!openGroups[FAVORITES_SECTION]} onOpenChange={() => toggleGroup(FAVORITES_SECTION)}>
          <SectionHeader isOpen={!!openGroups[FAVORITES_SECTION]} label={t("favoris")} />
          <CollapsibleContent className="space-y-0.5 pt-0.5">
            {favoriteItems.length > 0 ? (
              favoriteItems.map((item) => renderItem(item, "fav-"))
            ) : (
              <EmptyHint>{t("favorisVide")}</EmptyHint>
            )}
          </CollapsibleContent>
        </Collapsible>

        {contextualItems.length > 0 && (
          <Collapsible open={!!openGroups[CONTEXT_SECTION]} onOpenChange={() => toggleGroup(CONTEXT_SECTION)}>
            <SectionHeader isOpen={!!openGroups[CONTEXT_SECTION]} label={t("pourVous")} count={contextualItems.length} />
            <CollapsibleContent className="space-y-0.5 pt-0.5">
              {contextualItems.map((item) => renderItem(item, "ctx-"))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <div className="mt-4 border-t border-sidebar-border pt-3">
        <div className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("espaces")}</div>
        <div className="space-y-0.5">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter(canSee);
            if (items.length === 0) return null;
            const isOpen = !!openGroups[group.labelKey];
            // Espace replie mais contenant la page courante : on garde
            // l'entree active visible, comme Jira garde le projet courant.
            const activeItem = !isOpen ? items.find((item) => item.href === activeHref) : undefined;

            return (
              <Collapsible key={group.labelKey} open={isOpen} onOpenChange={() => toggleGroup(group.labelKey)}>
                <SectionHeader isOpen={isOpen} label={t(`groups.${group.labelKey}`)} count={items.length} />
                <CollapsibleContent className="space-y-0.5 pt-0.5 pb-1.5 pl-3">
                  {items.map((item) => renderItem(item))}
                </CollapsibleContent>
                {activeItem && <div className="pt-0.5 pb-1.5 pl-3">{renderItem(activeItem, "pinned-")}</div>}
              </Collapsible>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
