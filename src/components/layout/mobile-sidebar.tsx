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
      <SheetContent side="left" showCloseButton={false} aria-describedby={undefined}>
        <SheetHeader className="flex h-16 flex-row items-center border-b px-4">
          {/* Le logo contient deja le nom complet — SheetTitle garde
              l'accessibilite (Radix exige un titre) sans dupliquer le texte
              visuellement, voir le meme choix dans sidebar.tsx. */}
          <Image src="/logo.png" alt="AfriSime Work-Space" width={168} height={112} className="h-12 w-auto" />
          <SheetTitle className="sr-only">AfriSime Work-Space</SheetTitle>
        </SheetHeader>
        <SidebarNav permissions={permissions} roleKey={roleKey} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
