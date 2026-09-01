"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NotificationChannel } from "@/generated/prisma/enums";
import {
  updateNotificationChannelsPreferred,
  subscribePush,
  unsubscribePush,
} from "@/actions/notification-preferences.actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const CHANNEL_LABELS: Record<Exclude<NotificationChannel, "INTERNE">, { label: string; description: string }> = {
  EMAIL: { label: "Email", description: "Recevoir un email pour les notifications importantes." },
  SMS: { label: "SMS", description: "Recevoir un SMS sur le numéro renseigné dans votre profil." },
  MESSAGERIE_EXTERNE: { label: "WhatsApp", description: "Recevoir un message WhatsApp sur le numéro renseigné dans votre profil." },
  PUSH: { label: "Notifications navigateur", description: "Recevoir une notification push sur cet appareil, même onglet fermé." },
};

export function NotificationPreferencesForm({
  initialChannels,
  hasPhone,
}: {
  initialChannels: NotificationChannel[];
  hasPhone: boolean;
}) {
  const [channels, setChannels] = useState<Set<NotificationChannel>>(new Set(initialChannels));
  // L'abonnement Web Push est propre à ce navigateur/appareil : impossible à
  // connaître côté serveur (SSR), on l'établit après montage en interrogeant
  // le service worker local plutôt que via une prop serveur.
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setPushSubscribed(!!subscription))
      .catch(() => {});
  }, []);

  function toggleSimpleChannel(channel: Exclude<NotificationChannel, "INTERNE" | "PUSH">, checked: boolean) {
    const next = new Set(channels);
    if (checked) next.add(channel);
    else next.delete(channel);
    setChannels(next);

    startTransition(async () => {
      try {
        await updateNotificationChannelsPreferred(Array.from(next));
      } catch {
        toast.error("Impossible de mettre à jour vos préférences.");
        setChannels(channels);
      }
    });
  }

  async function togglePush(checked: boolean) {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Les notifications push ne sont pas prises en charge par ce navigateur.");
      return;
    }

    setPushBusy(true);
    try {
      if (checked) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          toast.error("Notifications push non configurées côté serveur.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Autorisation refusée.");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        await subscribePush({ endpoint: json.endpoint, keys: json.keys });
        setPushSubscribed(true);
        const next = new Set(channels).add("PUSH");
        setChannels(next);
        await updateNotificationChannelsPreferred(Array.from(next));
        toast.success("Notifications navigateur activées.");
      } else {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await unsubscribePush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPushSubscribed(false);
        const next = new Set(channels);
        next.delete("PUSH");
        setChannels(next);
        await updateNotificationChannelsPreferred(Array.from(next));
        toast.success("Notifications navigateur désactivées.");
      }
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Canaux de notification</CardTitle>
        <CardDescription>
          En plus des notifications internes (toujours actives), choisissez les canaux externes que vous souhaitez recevoir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(["EMAIL", "SMS", "MESSAGERIE_EXTERNE"] as const).map((channel) => (
          <div key={channel} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={`channel-${channel}`}>{CHANNEL_LABELS[channel].label}</Label>
              <p className="text-xs text-muted-foreground">{CHANNEL_LABELS[channel].description}</p>
              {(channel === "SMS" || channel === "MESSAGERIE_EXTERNE") && !hasPhone && (
                <Badge variant="outline" className="mt-1 text-[11px]">
                  Ajoutez un numéro de téléphone dans votre profil
                </Badge>
              )}
            </div>
            <Switch
              id={`channel-${channel}`}
              checked={channels.has(channel)}
              disabled={isPending}
              onCheckedChange={(checked) => toggleSimpleChannel(channel, checked)}
            />
          </div>
        ))}

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="channel-push">{CHANNEL_LABELS.PUSH.label}</Label>
            <p className="text-xs text-muted-foreground">{CHANNEL_LABELS.PUSH.description}</p>
            <p className="text-[11px] text-muted-foreground">Cet abonnement est propre à ce navigateur/appareil.</p>
          </div>
          <Switch id="channel-push" checked={pushSubscribed} disabled={pushBusy} onCheckedChange={togglePush} />
        </div>
      </CardContent>
    </Card>
  );
}
