"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { NotificationBell, type NotificationPreview } from "@/components/notifications/notification-bell";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

export function Topbar({
  userName,
  userImage,
  roleLabel,
  notifications,
  unreadCount,
  permissions,
}: {
  userName: string;
  userImage?: string | null;
  roleLabel: string;
  notifications: NotificationPreview[];
  unreadCount: number;
  permissions: string[];
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <MobileSidebar permissions={permissions} />
        <div className="show-from-lg text-sm text-muted-foreground">
          Planifier · Collaborer · Exécuter · Contrôler
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="show-from-sm text-left">
                <div className="text-sm font-medium leading-none">{userName}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/parametres/profil">
                <UserRound className="mr-2 h-4 w-4" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/parametres/securite">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Sécurité du compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
