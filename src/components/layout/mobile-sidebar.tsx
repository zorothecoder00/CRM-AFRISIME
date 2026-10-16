"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import { BrandMark } from "./brand-mark";

export function MobileSidebar({ permissions, roleKey }: { permissions: string[]; roleKey?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="show-mobile" aria-label="Ouvrir la navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-[280px] gap-0 text-sidebar-foreground"
      >
        <SheetHeader className="flex h-14 flex-row items-center border-b px-3 py-0">
          <BrandMark className="-ml-1" />
          <SheetTitle className="sr-only">AfriSime Work Space</SheetTitle>
        </SheetHeader>
        <SidebarNav permissions={permissions} roleKey={roleKey} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
