"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";

export function Sidebar({ canAccessAdministration }: { canAccessAdministration: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-col border-r bg-muted/20 md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">AfriFlow</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          if (item.href.startsWith("/administration") && !canAccessAdministration) {
            return null;
          }

          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                isActive ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
