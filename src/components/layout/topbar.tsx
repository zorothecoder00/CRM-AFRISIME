"use client";

import { usePathname } from "next/navigation";
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
import { LogOut, ShieldCheck, UserRound, Search, Mic, Clock, Bell, Mail, ClipboardList, MessageSquare, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { NotificationBell, type NotificationPreview } from "@/components/notifications/notification-bell";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
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
        <Button variant="ghost" size="sm" className="relative" asChild>
          <Link href={href} aria-label={label}>
            <Icon className="h-5 w-5" />
            {!!count && count > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 justify-center rounded-full p-0 text-[10px]"
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
  const pathname = usePathname();
  // Demande utilisateur — la barre de recherche de /tableaux-de-bord
  // deplacee du corps de page vers la topbar, juste a cote du bandeau
  // "Planifier · Collaborer · Exécuter · Contrôler" (uniquement sur cette
  // page : pas de recherche globale dans la topbar ailleurs).
  const showDashboardSearch = pathname === "/tableaux-de-bord";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <MobileSidebar permissions={permissions} roleKey={roleKey} />
        <div className="hidden items-center gap-3 lg:flex">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            Planifier · Collaborer · Exécuter · Contrôler
          </span>
          {showDashboardSearch && (
            <form action="/recherche" className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                type="search"
                placeholder="Rechercher tâche, projet, document…"
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
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
