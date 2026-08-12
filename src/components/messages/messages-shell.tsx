"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/messages/user-avatar";

// Pas d'infra temps reel (websocket/SSE) dans cette app : on simule le
// "vivant" en re-demandant les Server Components (liste + fil actif, tous
// deux sous ce layout) a intervalle regulier. router.refresh() re-fetch les
// donnees sans perdre l'etat local des composants client (ex: le brouillon
// en cours de frappe dans le composer).
const POLL_INTERVAL_MS = 5_000;

export type ConversationListItem = {
  id: string;
  title: string;
  isGroup: boolean;
  avatarUser: { name: string; image: string | null } | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/**
 * Coquille deux volets (liste + fil actif) a la maniere d'une appli de
 * messagerie. Le routage reste 100% SSR (Link + segments Next.js, pas de
 * polling/fetch cote client) : ce composant client ne gere que l'aspect
 * "quel panneau afficher sur mobile" via le pathname, et le surlignage de
 * la conversation active dans la liste.
 */
export function MessagesShell({
  conversations,
  headerAction,
  children,
}: {
  conversations: ConversationListItem[];
  headerAction: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;
  const hasActiveThread = !!activeId;

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] overflow-hidden rounded-2xl border bg-card ring-1 ring-foreground/[0.1] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_14px_28px_-18px_rgb(0_0_0/0.16)]">
      <div
        className={cn(
          "w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r",
          hasActiveThread ? "hidden" : "flex"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <div>
            <h1 className="text-lg font-semibold">Messages</h1>
            <p className="text-xs text-muted-foreground">{conversations.length} conversation(s)</p>
          </div>
          {headerAction}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">Aucune conversation pour le moment.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const unread = c.unreadCount > 0;
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/60",
                    activeId === c.id && "bg-primary/10"
                  )}
                >
                  <UserAvatar
                    name={c.avatarUser?.name ?? c.title}
                    image={c.avatarUser?.image}
                    isGroup={c.isGroup}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", unread ? "font-bold" : "font-semibold")}>{c.title}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatWhen(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs",
                          unread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {c.lastMessagePreview}
                      </p>
                      {unread && (
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <div className={cn("min-w-0 flex-1 flex-col", hasActiveThread ? "flex" : "hidden md:flex")}>
        {children}
      </div>
    </div>
  );
}
