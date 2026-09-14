import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Revue de robustesse (2026-09-11) — aucune limitation n'existait sur les
 * points d'authentification (bourrage d'identifiants, spam de tokens de
 * reset). Fenêtre fixe adossée à Postgres (pas de Redis/Upstash dans les
 * dépendances) : un compteur par clé logique, remis à zéro dès que la
 * fenêtre expire. Volontairement simple — une légère marge de dépassement
 * sous forte concurrence est acceptable pour un garde-fou anti-abus, pas
 * besoin d'un verrou distribué pour ça.
 */
export async function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();

  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  const windowExpired = !bucket || now.getTime() - bucket.windowStart.getTime() >= windowMs;

  if (windowExpired) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      update: { windowStart: now, count: 1 },
      create: { key, windowStart: now, count: 1 },
    });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now.getTime() - bucket.windowStart.getTime()) };
  }

  await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true, retryAfterMs: 0 };
}

/** IP client depuis les en-têtes de proxy (même extraction que auth.ts pour UserSession.ipAddress). */
export function getClientIp(headers: Headers | NextRequest["headers"]): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Analyse perf/charge (2026-09-14) — checkRateLimit ci-dessus n'était câblé
// que sur les points d'authentification (login, forgot-password) : les
// routes /api/v1/* (clé API externe, voir api-keys.ts) n'avaient elles
// aucune limite malgré le même modèle RateLimitBucket déjà en base. Un
// client externe qui boucle sans respecter de cache/backoff peut donc
// matraquer ces routes sans garde-fou. Petits wrappers dédiés plutôt que de
// changer la signature de checkRateLimit (utilisée telle quelle à 3 endroits
// existants) : gardent le style "limit/remaining/reset" habituel des API
// publiques (GitHub/Stripe) pour les en-têtes de réponse ci-dessous.
export type ApiRateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: Date };

// Défaut raisonnable pour un consommateur externe (BI, AfriGes...) — lecture
// seule, pagination bornée (take: 200 sur chaque route) : 60 req/min laisse
// largement de la marge à un usage normal tout en bornant un client qui
// boucle sans respecter de cache/backoff.
export const API_KEY_RATE_LIMIT = 60;
export const API_KEY_RATE_WINDOW_MS = 60_000;

/** Limite par clé API — clé de bucket dédiée pour ne pas se mélanger avec d'autres usages du même modèle. */
export async function checkApiKeyRateLimit(apiKeyId: string): Promise<ApiRateLimitResult> {
  const key = `apikey:${apiKeyId}`;
  const now = new Date();
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  const windowExpired = !bucket || now.getTime() - bucket.windowStart.getTime() >= API_KEY_RATE_WINDOW_MS;

  if (windowExpired) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
    return { allowed: true, limit: API_KEY_RATE_LIMIT, remaining: API_KEY_RATE_LIMIT - 1, resetAt: new Date(now.getTime() + API_KEY_RATE_WINDOW_MS) };
  }

  const resetAt = new Date(bucket.windowStart.getTime() + API_KEY_RATE_WINDOW_MS);
  if (bucket.count >= API_KEY_RATE_LIMIT) {
    return { allowed: false, limit: API_KEY_RATE_LIMIT, remaining: 0, resetAt };
  }

  await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true, limit: API_KEY_RATE_LIMIT, remaining: API_KEY_RATE_LIMIT - bucket.count - 1, resetAt };
}

/** En-têtes standard (style GitHub/Stripe) à renvoyer sur toute réponse d'une route limitée. */
export function rateLimitHeaders(result: ApiRateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}
