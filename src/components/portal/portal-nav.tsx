"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PortalNavVisibility } from "@/lib/portal-nav-visibility";

export function PortalNav({ visibility }: { visibility: PortalNavVisibility }) {
  const pathname = usePathname();

  const items: { href: string; label: string; badge?: number; show: boolean }[] = [
    { href: "/portail", label: "Accueil", show: true },
    { href: "/portail/projets", label: "Mes projets", show: visibility.projects },
    { href: "/portail/programmes", label: "Programmes", show: visibility.programmes },
    { href: "/portail/reunions", label: "Réunions", show: visibility.meetings },
    { href: "/portail/actualites", label: "Actualités", show: visibility.news },
    { href: "/portail/messages", label: "Messages", badge: visibility.unreadMessages, show: visibility.droitMessages },
  ].filter((item) => item.show);

  return (
    <nav className="flex flex-wrap gap-1 border-b bg-background/60 px-4 py-2 text-sm sm:px-6">
      {items.map((item) => {
        const active = item.href === "/portail" ? pathname === "/portail" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
