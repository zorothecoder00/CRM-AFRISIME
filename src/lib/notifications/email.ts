import { Resend } from "resend";

export type SendResult = { sent: boolean; reason?: string };

let cachedClient: Resend | null | undefined;

function getClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  cachedClient = apiKey ? new Resend(apiKey) : null;
  return cachedClient;
}

/**
 * Envoie un email transactionnel via Resend. Retourne { sent: false } sans
 * lever d'exception si EMAIL_ENABLED n'est pas "true" ou si RESEND_API_KEY
 * est absente — meme comportement "non configure, journalise, pas d'echec
 * bloquant" que SMS/WhatsApp (voir attemptExternalDelivery dans notify.ts).
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendResult> {
  if (process.env.EMAIL_ENABLED !== "true") {
    return { sent: false, reason: "EMAIL_ENABLED n'est pas activé." };
  }

  const client = getClient();
  if (!client) {
    return { sent: false, reason: "RESEND_API_KEY non configurée." };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { sent: false, reason: "EMAIL_FROM non configurée." };
  }

  const result = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (result.error) {
    return { sent: false, reason: result.error.message };
  }
  return { sent: true };
}
