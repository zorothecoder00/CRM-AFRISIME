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
  sidebarNotifications,
  unreadCount,
  aPlanifierCount,
  permissions,
}: {
  userName: string;
  userImage?: string | null;
  roleLabel: string;
  /** Date du jour + rappel disponibilité — affiché à la suite du titre "Planning personnel" plutôt que sous "Bonjour + nom" sur le hub (demande utilisateur). */
  dateLabel: string;
  /** Aperçu du clochon (court, 5 max). */
  notifications: NotificationPreview[];
  /** Liste plus longue pour le panneau NotificationsSheet du tiroir mobile (demande utilisateur — "Alertes" n'ouvre plus /notifications directement). */
  sidebarNotifications: NotificationPreview[];
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
    // Refonte « façon Jira » : barre blanche, comme la topbar globale.
    <header className="flex h-14 items-center justify-between gap-3 border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <PersonalPlanningMobileSidebar
          aPlanifierCount={aPlanifierCount}
          alertesCount={unreadCount}
          permissions={permissions}
          notifications={sidebarNotifications}
        />
        <CalendarCheck2 className="hidden size-5 text-primary sm:block" />
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold leading-none">Planning personnel</h1>
          </div>
          <p className="show-from-lg mt-1 text-xs text-muted-foreground">
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
          className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground hover:bg-surface-sunken focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>

      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mon compte">
              <Avatar className="h-7 w-7">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-semibold text-foreground">{userName}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </DropdownMenuLabel>
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
              <Link href="/planning-personnel/parametres">
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
