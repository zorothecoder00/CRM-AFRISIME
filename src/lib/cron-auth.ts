import { timingSafeEqual } from "crypto";

/**
 * Revue de robustesse (2026-09-11) — l'ancienne comparaison
 * (`authHeader !== "Bearer " + process.env.CRON_SECRET`) avait deux
 * défauts : si CRON_SECRET n'est pas défini en déploiement, la valeur
 * attendue devient littéralement la chaîne "Bearer undefined", triviale à
 * deviner ; et `!==` n'est pas une comparaison à temps constant.
 */
export function isValidCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(authHeader.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
