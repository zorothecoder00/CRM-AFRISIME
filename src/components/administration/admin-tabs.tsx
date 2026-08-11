"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/administration/utilisateurs", label: "Utilisateurs" },
  { href: "/administration/roles", label: "Rôles & permissions" },
  { href: "/administration/workflows", label: "Circuits de validation" },
  { href: "/administration/securite", label: "Sécurité" },
  { href: "/administration/integrations", label: "Intégrations" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            pathname === tab.href
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
