import { normalizePhoneNumber } from "@/lib/notifications/phone";
import type { SendResult } from "@/lib/notifications/email";

/**
 * Canal MESSAGERIE_EXTERNE (NotificationChannel) — WhatsApp via le
 * fournisseur configure (WA_PROVIDER, Module 9). Meme approche que sms.ts :
 * appels HTTP directs, pas de SDK fournisseur.
 */
export async function sendWhatsApp(params: { to: string; message: string }): Promise<SendResult> {
  if (process.env.WA_ENABLED !== "true") {
    return { sent: false, reason: "WA_ENABLED n'est pas activé." };
  }

  const to = normalizePhoneNumber(params.to);
  if (!to) {
    return { sent: false, reason: "Numéro de téléphone invalide ou absent." };
  }

  const provider = process.env.WA_PROVIDER ?? "twilio";
  if (provider === "meta") {
    return sendViaMeta(to, params.message);
  }
  return sendViaTwilioWhatsApp(to, params.message);
}

async function sendViaTwilioWhatsApp(to: string, message: string): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WA_FROM;
  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WA_FROM non configurés." };
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      Body: message,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { sent: false, reason: data?.message ?? `Twilio a répondu ${res.status}.` };
  }
  return { sent: true };
}

async function sendViaMeta(to: string, message: string): Promise<SendResult> {
  const token = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) {
    return { sent: false, reason: "META_WA_TOKEN / META_WA_PHONE_ID non configurés." };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { sent: false, reason: data?.error?.message ?? `Meta a répondu ${res.status}.` };
  }
  return { sent: true };
}
