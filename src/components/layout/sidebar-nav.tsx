"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, getContextualNavItems, type NavItem } from "./nav-config";

/** Contenu de navigation partagé entre la sidebar desktop et le tiroir mobile. */
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
  const contextualItems = getContextualNavItems(roleKey, permissions);

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    const title = t(`items.${item.titleKey}`);

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/30"
          title={t("moduleAVenir")}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98]",
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
        {title}
      </Link>
    );
  }

  return (
    <nav className={cn("flex-1 space-y-5 overflow-y-auto p-3", className)}>
      {contextualItems.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-primary uppercase">{t("pourVous")}</div>
          {contextualItems.map(renderItem)}
        </div>
      )}
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.permission || permissions.includes(item.permission));
        if (items.length === 0) return null;

        return (
          <div key={group.labelKey} className="space-y-1">
            <div className="px-3 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
              {t(`groups.${group.labelKey}`)}
            </div>
            {items.map(renderItem)}
          </div>
        );
      })}
    </nav>
  );
}
