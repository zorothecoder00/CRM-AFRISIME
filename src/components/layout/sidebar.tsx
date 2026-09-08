"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";

export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  const { collapsed, toggle } = useSidebarCollapsed("sidebar-collapsed");

  return (
    <aside
      className={cn(
        "show-desktop relative z-10 flex-col border-r bg-sidebar text-sidebar-foreground shadow-[6px_0_24px_-12px_rgba(0,0,0,0.5)] transition-[width] duration-200",
        collapsed ? "w-[70px]" : "w-64"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}
        className="absolute -right-3 top-4 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      {/* Le logo integre deja le nom "AfriSime Work Space" — un libelle
          texte separe en dessous etait redondant, retire au profit d'un
          logo plus grand. Fond blanc dedie (le texte du logo, en bleu,
          serait illisible sur le bleu nuit de la sidebar/bg-sidebar) —
          demande utilisateur : alignement sur le fond du logo de
          Planning personnel (personal-planning-sidebar.tsx). */}
      <div className="flex flex-col items-center overflow-hidden border-b bg-white px-4 py-0">
        <Image
          src="/logo.png"
          alt="AfriSime Work Space"
          width={240}
          height={160}
          className={cn("w-auto transition-all duration-200", collapsed ? "h-9" : "h-32")}
          priority
        />
      </div>
      <SidebarNav permissions={permissions} roleKey={roleKey} collapsed={collapsed} />
    </aside>
  );
}
