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
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 justify-center rounded-full p-0 text-[10px]"
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
