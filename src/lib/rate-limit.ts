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
