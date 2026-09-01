import { normalizePhoneNumber } from "@/lib/notifications/phone";
import type { SendResult } from "@/lib/notifications/email";

/**
 * Envoie un SMS via le fournisseur configure (SMS_PROVIDER, Module 9 —
 * Téléphonie & alertes). Appels HTTP directs (pas de SDK fournisseur) pour
 * rester leger : les deux fournisseurs exposent une API REST simple.
 * Retourne { sent: false } sans lever d'exception si SMS_ENABLED n'est pas
 * "true" ou si les identifiants du fournisseur choisi sont absents.
 */
export async function sendSms(params: { to: string; message: string }): Promise<SendResult> {
  if (process.env.SMS_ENABLED !== "true") {
    return { sent: false, reason: "SMS_ENABLED n'est pas activé." };
  }

  const to = normalizePhoneNumber(params.to);
  if (!to) {
    return { sent: false, reason: "Numéro de téléphone invalide ou absent." };
  }

  const provider = process.env.SMS_PROVIDER ?? "africas_talking";
  if (provider === "twilio") {
    return sendViaTwilio(to, params.message);
  }
  return sendViaAfricasTalking(to, params.message);
}

async function sendViaAfricasTalking(to: string, message: string): Promise<SendResult> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) {
    return { sent: false, reason: "AT_API_KEY / AT_USERNAME non configurés." };
  }

  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    return { sent: false, reason: `Africa's Talking a répondu ${res.status}.` };
  }
  const data = (await res.json()) as { SMSMessageData?: { Recipients?: { status: string }[] } };
  const recipient = data.SMSMessageData?.Recipients?.[0];
  if (recipient && recipient.status !== "Success") {
    return { sent: false, reason: `Africa's Talking : ${recipient.status}` };
  }
  return { sent: true };
}

async function sendViaTwilio(to: string, message: string): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!accountSid || !authToken || !from) {
    return { sent: false, reason: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_SMS_FROM non configurés." };
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { sent: false, reason: data?.message ?? `Twilio a répondu ${res.status}.` };
  }
  return { sent: true };
}
