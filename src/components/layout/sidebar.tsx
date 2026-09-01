import Image from "next/image";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  return (
    <aside className="show-desktop relative z-10 w-64 flex-col border-r bg-sidebar text-sidebar-foreground shadow-[6px_0_24px_-12px_rgba(0,0,0,0.5)]">
      {/* Le logo integre deja le nom "AfriSime Work Space" — un libelle
          texte separe en dessous etait redondant, retire au profit d'un
          logo plus grand. Fond dedie (slate, distinct du bleu nuit de la
          sidebar ET du fond clair du contenu principal) : le texte du logo
          est en bleu, illisible sur le fond bleu nuit de la sidebar
          (bg-sidebar) ni assez contrasté sur un fond blanc/gris clair. */}
      <div className="flex flex-col items-center border-b bg-slate-400 px-4 py-4">
        <Image src="/logo.png" alt="AfriSime Work Space" width={240} height={160} className="h-32 w-auto" priority />
      </div>
      <SidebarNav permissions={permissions} roleKey={roleKey} />
    </aside>
  );
}
