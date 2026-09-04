"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PersonalPlanningSidebarNav } from "./personal-planning-sidebar-nav";
import type { NotificationPreview } from "@/components/notifications/notification-bell";

export function PersonalPlanningMobileSidebar({
  aPlanifierCount,
  alertesCount,
  permissions,
  notifications,
}: {
  aPlanifierCount: number;
  alertesCount: number;
  permissions: string[];
  notifications: NotificationPreview[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="show-mobile" aria-label="Ouvrir la navigation du planning personnel">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" showCloseButton={false} aria-describedby={undefined} className="text-sidebar-foreground">
        <SheetHeader className="flex flex-col items-center border-b bg-white px-4 py-0">
          <Image src="/logo.png" alt="AfriSime Work Space" width={240} height={160} className="h-32 w-auto" />
          <SheetTitle className="sr-only">Planning personnel</SheetTitle>
        </SheetHeader>
        <PersonalPlanningSidebarNav
          aPlanifierCount={aPlanifierCount}
          alertesCount={alertesCount}
          permissions={permissions}
          onNavigate={() => setOpen(false)}
          notifications={notifications}
        />
      </SheetContent>
    </Sheet>
  );
}
