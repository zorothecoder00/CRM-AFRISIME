import Image from "next/image";
import { PersonalPlanningSidebarNav } from "./personal-planning-sidebar-nav";

/**
 * Sidebar dédiée au module Planning personnel — remplace entièrement la
 * sidebar globale de l'application sur ces pages (refonte design demandée).
 */
export function PersonalPlanningSidebar({
  aPlanifierCount,
  alertesCount,
  permissions,
}: {
  aPlanifierCount: number;
  alertesCount: number;
  permissions: string[];
}) {
  return (
    <aside className="show-desktop relative z-10 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground shadow-[6px_0_24px_-12px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col items-center border-b bg-amber-100 px-4 py-4">
        <Image src="/logo.png" alt="AfriSime Work Space" width={240} height={160} className="h-32 w-auto" priority />
      </div>
      <PersonalPlanningSidebarNav aPlanifierCount={aPlanifierCount} alertesCount={alertesCount} permissions={permissions} />
      <div className="border-t p-3 text-[10px] leading-relaxed text-sidebar-foreground/40">
        Planifier · Collaborer · Exécuter · Contrôler
      </div>
    </aside>
  );
}
