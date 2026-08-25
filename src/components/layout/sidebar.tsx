import Image from "next/image";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  return (
    <aside className="show-desktop w-64 flex-col border-r bg-sidebar">
      <div className="flex flex-col items-center gap-1 border-b px-4 py-3">
        {/* Logo et nom empiles verticalement plutot que cote a cote : la
            largeur reduite de la sidebar (w-64) ne laisse pas la place pour
            un grand logo ET le nom sur la meme ligne sans repasser le nom
            sur deux lignes. Empiler decouple totalement la taille du logo
            de la largeur du texte. */}
        <Image src="/logo.png" alt="AfriSime Work-Space" width={240} height={160} className="h-20 w-auto" priority />
        <span className="text-sm font-semibold whitespace-nowrap">AfriSime Work-Space</span>
      </div>
      <SidebarNav permissions={permissions} roleKey={roleKey} />
    </aside>
  );
}
