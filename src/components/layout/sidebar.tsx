import Image from "next/image";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  return (
    <aside className="show-desktop w-64 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center border-b px-4">
        {/* Le logo contient deja le nom complet ("AfriSime Work Space") — pas
            de libelle texte a cote : les deux se disputaient la largeur
            reduite de la sidebar (w-64) et forcaient le texte sur deux
            lignes. Un seul element, plus grand, lisible sur une ligne. */}
        <Image src="/logo.png" alt="AfriSime Work-Space" width={168} height={112} className="h-12 w-auto" priority />
      </div>
      <SidebarNav permissions={permissions} roleKey={roleKey} />
    </aside>
  );
}
