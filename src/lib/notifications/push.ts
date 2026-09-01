import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { SendResult } from "@/lib/notifications/email";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Envoie une notification push a tous les abonnements enregistres de
 * l'utilisateur (un par navigateur/appareil, voir PushSubscription).
 * Contrairement a EMAIL/SMS/MESSAGERIE_EXTERNE, ce canal ne depend d'aucun
 * fournisseur tiers a activer explicitement : il fonctionne des que les cles
 * VAPID sont presentes (generees une fois, cf. .env) et qu'au moins un
 * navigateur s'est abonne (bouton "Activer les notifications", voir
 * push-subscribe-button.tsx).
 */
export async function sendPush(params: { userId: string; title: string; body?: string; url?: string }): Promise<SendResult> {
  if (!ensureVapidConfigured()) {
    return { sent: false, reason: "Clés VAPID non configurées." };
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: params.userId } });
  if (subscriptions.length === 0) {
    return { sent: false, reason: "Aucun abonnement push pour cet utilisateur." };
  }

  const payload = JSON.stringify({ title: params.title, body: params.body, url: params.url });

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        return true;
      } catch (err) {
        // 404/410 : l'abonnement n'est plus valide cote navigateur (desinstalle,
        // donnees de site effacees...) — on le retire pour ne plus retenter.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        return false;
      }
    })
  );

  const sentCount = results.filter(Boolean).length;
  if (sentCount === 0) {
    return { sent: false, reason: "Échec de l'envoi vers tous les abonnements." };
  }
  return { sent: true };
}
