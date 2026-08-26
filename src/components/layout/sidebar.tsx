import Image from "next/image";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  return (
    <aside className="show-desktop w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col items-center border-b px-4 py-3">
        {/* Le logo integre deja le nom "AfriSime Work Space" — un libelle
            texte separe en dessous etait redondant, retire au profit d'un
            logo plus grand. */}
        <Image src="/logo.png" alt="AfriSime Work Space" width={240} height={160} className="h-32 w-auto" priority />
      </div>
      <SidebarNav permissions={permissions} roleKey={roleKey} />
    </aside>
  );
}
