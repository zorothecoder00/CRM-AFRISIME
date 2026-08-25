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
          <Icon className="h-4 w-4" />
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
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
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
