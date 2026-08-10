"use client";

import { markAsRead } from "@/actions/notification.actions";

export function NotificationRow({
  notification,
  children,
}: {
  notification: { id: string; isRead: boolean };
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={() => {
        if (!notification.isRead) markAsRead(notification.id);
      }}
      className={notification.isRead ? "" : "bg-muted/40"}
    >
      {children}
    </div>
  );
}
