"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="show-mobile" aria-label="Ouvrir la navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} aria-describedby={undefined} className="text-sidebar-foreground">
        <SheetHeader className="flex flex-col items-center border-b px-4 py-3">
          {/* Le logo integre deja le nom "AfriSime Work Space" — le libelle
              texte visible a ete retire (redondant), SheetTitle garde pour
              l'accessibilite (lecteur d'ecran) mais visuellement masque. Fond
              clair dedie : le texte du logo est en bleu, illisible sur le
              fond bleu nuit de la sidebar. */}
          <div className="rounded-md bg-white p-2 shadow-md shadow-black/30">
            <Image src="/logo.png" alt="AfriSime Work Space" width={240} height={160} className="h-32 w-auto" />
          </div>
          <SheetTitle className="sr-only">AfriSime Work Space</SheetTitle>
        </SheetHeader>
        <SidebarNav permissions={permissions} roleKey={roleKey} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
