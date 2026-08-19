"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const contextualItems = getContextualNavItems(roleKey, permissions);

  function renderItem(item: NavItem) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
          title="Module à venir"
        >
          <Icon className="h-4 w-4" />
          {item.title}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary before:absolute before:top-1/2 before:left-0 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.title}
      </Link>
    );
  }

  return (
    <nav className={cn("flex-1 space-y-5 overflow-y-auto p-3", className)}>
      {contextualItems.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 text-xs font-semibold tracking-wide text-primary/80 uppercase">Pour vous</div>
          {contextualItems.map(renderItem)}
        </div>
      )}
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.permission || permissions.includes(item.permission));
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
              {group.label}
            </div>
            {items.map(renderItem)}
          </div>
        );
      })}
    </nav>
  );
}
