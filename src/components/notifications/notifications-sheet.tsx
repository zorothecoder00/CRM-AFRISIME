"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { NotificationRow } from "@/components/notifications/notification-row";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NOTIFICATION_TONE_META, toneForNotificationType } from "@/lib/notification-tone";
import type { NotificationPreview } from "@/components/notifications/notification-bell";

/**
 * Demande utilisateur — l'ancien lien "Alertes" de la sidebar planning
 * personnel renvoyait directement vers /notifications (page complète, autre
 * mise en page), ce qui cassait la navigation fluide du module. Panneau
 * latéral réutilisable à la place : même liste que /notifications (juste
 * plus d'entrées que l'aperçu du clochon du topbar), sans quitter la page
 * courante — "Voir toutes les notifications" reste disponible en bas pour
 * qui veut vraiment la page complète.
 */
export function NotificationsSheet({
  notifications,
  unreadCount,
  trigger,
}: {
  notifications: NotificationPreview[];
  unreadCount: number;
  /** Le déclencheur (bouton stylé comme les autres items de la sidebar) — fourni par l'appelant pour rester visuellement identique aux autres liens. */
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle>Notifications ({unreadCount} non lue{unreadCount > 1 ? "s" : ""})</SheetTitle>
          {unreadCount > 0 && <MarkAllReadButton />}
        </SheetHeader>

        <div className="flex-1 space-y-1 overflow-y-auto px-1">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Aucune notification.</p>
          )}
          {notifications.map((n) => {
            const tone = NOTIFICATION_TONE_META[toneForNotificationType(n.type)];
            return (
              <NotificationRow key={n.id} notification={n}>
                <div className="rounded-md border p-2.5 text-sm">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${tone.className}`}>
                      {tone.emoji}
                    </span>
                    {!n.isRead && <Badge variant="secondary" className="text-[10px]">Non lu</Badge>}
                    <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {n.lien ? (
                    <Link href={n.lien} onClick={() => setOpen(false)} className="font-medium hover:underline">
                      {n.titre}
                    </Link>
                  ) : (
                    <span className="font-medium">{n.titre}</span>
                  )}
                </div>
              </NotificationRow>
            );
          })}
        </div>

        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block rounded-md border p-2 text-center text-sm text-primary hover:bg-muted/40"
        >
          Voir toutes les notifications
        </Link>
      </SheetContent>
    </Sheet>
  );
}
