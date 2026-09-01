"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationChannel } from "@/generated/prisma/enums";

const EXTERNAL_CHANNELS: NotificationChannel[] = ["EMAIL", "SMS", "PUSH", "MESSAGERIE_EXTERNE"];

/** Met à jour les canaux externes préférés (V2.2 §39) — INTERNE reste toujours implicite. */
export async function updateNotificationChannelsPreferred(channels: NotificationChannel[]) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");

  const filtered = channels.filter((c) => EXTERNAL_CHANNELS.includes(c));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationChannelsPreferred: ["INTERNE", ...filtered] },
  });

  revalidatePath("/parametres/notifications");
}

/** Enregistre un abonnement Web Push côté serveur (bouton "Activer les notifications"). */
export async function subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId: session.user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  revalidatePath("/parametres/notifications");
}

/** Retire l'abonnement Web Push de cet appareil (bouton "Désactiver"). */
export async function unsubscribePush(endpoint: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });

  revalidatePath("/parametres/notifications");
}
