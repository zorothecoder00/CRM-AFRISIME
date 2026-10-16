"use client";

import Link from "next/link";
import { markAsRead } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";

export type NotificationPreview = {
  id: string;
  titre: string;
  lien: string | null;
  isRead: boolean;
  createdAt: string;
  // Demande utilisateur — necessaire au panneau NotificationsSheet pour la
  // pastille de couleur (toneForNotificationType) ; NotificationBell (ce
  // fichier) ne l'utilise pas lui-meme, juste transporte au meme endroit
  // que les autres champs de l'aperçu.
  type: string;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationPreview[];
  unreadCount: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 justify-center rounded-full bg-destructive px-1 text-[10px] text-white normal-case dark:text-background"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Aucune notification.</p>
        )}
        {notifications.map((n) => (
          <DropdownMenuItem key={n.id} asChild>
            <Link
              href={n.lien ?? "/notifications"}
              onClick={() => markAsRead(n.id)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className={n.isRead ? "text-sm" : "text-sm font-medium"}>{n.titre}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("fr-FR")}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm">
            Voir toutes les notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
