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
        <SheetHeader className="flex flex-col items-center gap-1 border-b px-4 py-3">
          {/* Meme choix que sidebar.tsx : logo et nom empiles verticalement
              plutot que cote a cote, pour un grand logo lisible sans repasser
              le nom sur deux lignes. */}
          <Image src="/logo.png" alt="AfriSime Work-Space" width={240} height={160} className="h-20 w-auto" />
          <SheetTitle className="text-sm font-semibold whitespace-nowrap">AfriSime Work-Space</SheetTitle>
        </SheetHeader>
        <SidebarNav permissions={permissions} roleKey={roleKey} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
