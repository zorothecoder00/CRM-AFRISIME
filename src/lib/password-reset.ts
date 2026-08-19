import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Crée un token de réinitialisation et l'URL correspondante. Partagé entre
 * le flux self-service (/api/auth/forgot-password) et la génération
 * assistée par un administrateur (utilisateurs/[EditUserDialog]) — même
 * mécanisme, deux points d'entrée. Aucun fournisseur email/SMS n'est câblé
 * dans cette instance (pas de clé API), donc l'URL n'est jamais envoyée
 * automatiquement : le flux self-service la journalise côté serveur
 * (utile seulement à un développeur ayant accès aux logs), le flux admin
 * l'affiche directement dans l'UI pour transmission manuelle — voir
 * generatePasswordResetLink dans user.actions.ts, qui est le vrai chemin
 * de récupération utilisable en production tant qu'aucun fournisseur
 * n'est connecté.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return `${process.env.NEXTAUTH_URL ?? ""}/reset-password?token=${rawToken}`;
}
