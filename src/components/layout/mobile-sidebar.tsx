"use client";

import { useState } from "react";
import { Menu, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar({ canAccessAdministration }: { canAccessAdministration: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="show-mobile" aria-label="Ouvrir la navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} aria-describedby={undefined}>
        <SheetHeader className="flex h-14 flex-row items-center gap-2.5 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Workflow className="h-4 w-4" />
          </div>
          <SheetTitle className="text-lg">AfriFlow</SheetTitle>
        </SheetHeader>
        <SidebarNav
          canAccessAdministration={canAccessAdministration}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
