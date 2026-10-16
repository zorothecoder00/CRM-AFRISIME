"use client";

import { useEffect, useRef } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LogOut,
  ShieldCheck,
  UserRound,
  Search,
  Mic,
  Clock,
  Bell,
  Mail,
  ClipboardList,
  MessageSquare,
  LifeBuoy,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { NotificationBell, type NotificationPreview } from "@/components/notifications/notification-bell";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { BrandMark } from "@/components/layout/brand-mark";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions";

/** Raccourci icône topbar — demande utilisateur : Demandes/Messagerie/Courrier
 * au niveau du profil (à côté de la cloche) plutôt que dans la sidebar.
 * `count` affiche une pastille (comme la cloche de notifications) pour
 * signaler une action en attente sans avoir à ouvrir la page. */
function TopbarShortcut({ href, label, icon: Icon, count }: { href: string; label: string; icon: LucideIcon; count?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" asChild>
          <Link href={href} aria-label={label}>
            <Icon className="h-[18px] w-[18px]" />
            {!!count && count > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center rounded-full bg-destructive px-1 text-[10px] text-white normal-case dark:text-background"
              >
                {count > 9 ? "9+" : count}
              </Badge>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Topbar({
  userName,
  userImage,
  roleLabel,
  roleKey,
  notifications,
  unreadCount,
  pendingRequestsCount,
  unreadMessagesCount,
  pendingCourriersCount,
  permissions,
}: {
  userName: string;
  userImage?: string | null;
  roleLabel: string;
  roleKey?: string;
  notifications: NotificationPreview[];
  unreadCount: number;
  pendingRequestsCount?: number;
  unreadMessagesCount?: number;
  pendingCourriersCount?: number;
  permissions: string[];
}) {
  const { toggle: toggleSidebar } = useSidebarCollapsed("sidebar-collapsed");
  const searchRef = useRef<HTMLInputElement>(null);

  // Raccourci « / » (comme Jira) : place le curseur dans la recherche globale,
  // sauf si l'utilisateur est deja en train de saisir ailleurs.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Refonte « façon Jira » : barre blanche pleine largeur au-dessus de la
  // sidebar — marque a gauche, recherche globale au centre (disponible sur
  // toutes les pages), raccourcis et profil a droite.
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3">
      <div className="flex items-center gap-1">
        <MobileSidebar permissions={permissions} roleKey={roleKey} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="show-desktop text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              aria-label="Afficher / masquer la barre latérale"
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Barre latérale</TooltipContent>
        </Tooltip>
        <BrandMark />
      </div>

      <form action="/recherche" role="search" className="relative mx-auto hidden w-full max-w-[560px] sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          name="q"
          type="search"
          placeholder="Rechercher une tâche, un projet, un contact…"
          aria-label="Recherche globale"
          className="h-8 w-full rounded-md border border-input bg-background pr-9 pl-8 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:bg-surface-sunken focus-visible:border-ring focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center rounded-[3px] border bg-surface-sunken px-1.5 font-mono text-[11px] text-muted-foreground md:inline-flex">
          /
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground sm:hidden" asChild>
          <Link href="/recherche" aria-label="Recherche">
            <Search className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        {permissions.includes(PERMISSIONS.ADMIN_REQUEST_READ) && (
          <TopbarShortcut href="/demandes" label="Demandes" icon={ClipboardList} count={pendingRequestsCount} />
        )}
        {permissions.includes(PERMISSIONS.MESSAGE_READ) && (
          <TopbarShortcut href="/messages" label="Messagerie" icon={MessageSquare} count={unreadMessagesCount} />
        )}
        {permissions.includes(PERMISSIONS.COURRIER_READ) && (
          <TopbarShortcut href="/courrier" label="Courrier" icon={Mail} count={pendingCourriersCount} />
        )}
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <TopbarShortcut href="/guide" label="Aide" icon={LifeBuoy} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-1 rounded-full" aria-label="Mon compte">
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
              <Link href="/recherche">
                <Search className="mr-2 h-4 w-4" />
                Recherche
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/assistant">
                <Mic className="mr-2 h-4 w-4" />
                Assistant
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/guide">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Guide d&apos;utilisation
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
