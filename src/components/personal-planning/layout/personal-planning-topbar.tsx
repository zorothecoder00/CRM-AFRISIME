"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { CalendarCheck2, LogOut, Search, ShieldCheck, UserRound, Clock, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell, type NotificationPreview } from "@/components/notifications/notification-bell";
import { PersonalPlanningMobileSidebar } from "./personal-planning-mobile-sidebar";

/** En-tête dédié au module Planning personnel, distinct du Topbar global de l'application. */
export function PersonalPlanningTopbar({
  userName,
  userImage,
  roleLabel,
  dateLabel,
  notifications,
  unreadCount,
  aPlanifierCount,
  permissions,
}: {
  userName: string;
  userImage?: string | null;
  roleLabel: string;
  /** Date du jour + rappel disponibilité — affiché à la suite du titre "Planning personnel" plutôt que sous "Bonjour + nom" sur le hub (demande utilisateur). */
  dateLabel: string;
  notifications: NotificationPreview[];
  unreadCount: number;
  aPlanifierCount: number;
  permissions: string[];
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <PersonalPlanningMobileSidebar aPlanifierCount={aPlanifierCount} alertesCount={unreadCount} permissions={permissions} />
        <CalendarCheck2 className="hidden size-6 text-primary sm:block" />
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold leading-none">Planning personnel</h1>
            <span className="show-from-lg text-xs text-muted-foreground">Planifier · Collaborer · Exécuter · Contrôler</span>
          </div>
          <p className="show-from-lg text-xs text-muted-foreground">
            <span className="capitalize">{dateLabel}</span> · Seule votre disponibilité (occupé/libre) est visible des autres.
          </p>
        </div>
      </div>

      <form action="/recherche" className="show-from-sm relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          placeholder="Rechercher tâche, activité, réunion, projet…"
          className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

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
            <DropdownMenuItem asChild>
              <Link href="/parametres/horaires">
                <Clock className="mr-2 h-4 w-4" />
                Horaires de travail
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/parametres/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <CalendarCheck2 className="mr-2 h-4 w-4" />
                Retour au tableau de bord
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
