import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { PermissionKey } from "@/lib/permissions";

const PREFIX = "afk_";

/**
 * Clés API (cahier des charges V2.2 §34). Contrairement au secret TOTP
 * (crypto.ts, chiffré réversiblement — l'app doit pouvoir le relire pour
 * vérifier un code), une clé API n'a jamais besoin d'être relue : seul son
 * hash SHA-256 est stocké (même principe qu'un token GitHub/Stripe), le
 * texte en clair n'est montré qu'une seule fois à la création.
 */
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const secret = crypto.randomBytes(24).toString("hex");
  const plaintext = `${PREFIX}${secret}`;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, prefix: plaintext.slice(0, 12), hash };
}

export type AuthenticatedApiKey = { id: string; permissions: PermissionKey[] };

/** Vérifie un header `Authorization: Bearer <clé>` — retourne null si absent/invalide/révoquée. */
export async function authenticateApiKey(authHeader: string | null): Promise<AuthenticatedApiKey | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const plaintext = authHeader.slice("Bearer ".length).trim();
  if (!plaintext.startsWith(PREFIX)) return null;

  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const key = await prisma.apiKey.findFirst({ where: { keyHash: hash, revokedAt: null } });
  if (!key) return null;

  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { id: key.id, permissions: key.permissions as PermissionKey[] };
}

export function apiKeyHasPermission(key: AuthenticatedApiKey, permission: PermissionKey): boolean {
  return key.permissions.includes(permission);
}
