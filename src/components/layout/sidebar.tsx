"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-config";

export function Sidebar({ canAccessAdministration }: { canAccessAdministration: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="show-desktop w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Workflow className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold">AfriFlow</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.href.startsWith("/administration") || canAccessAdministration
          );
          if (items.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
                {group.label}
              </div>
              {items.map((item) => {
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
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
