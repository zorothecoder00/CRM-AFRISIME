import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Reponse volontairement identique que l'email corresponde a un compte ou
// non, pour ne pas permettre a un attaquant de decouvrir quels emails sont
// enregistres (anti-enumeration).
const GENERIC_MESSAGE = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.";

/**
 * Aucun fournisseur email/SMS n'est cable dans cette instance (pas de cle
 * API) : le lien genere n'est donc envoye a personne par ce flux
 * self-service, seulement journalise cote serveur. Le vrai chemin de
 * recuperation utilisable en production est administratif — voir
 * generatePasswordResetLink (user.actions.ts), qui affiche le lien
 * directement dans l'UI de /administration/utilisateurs pour transmission
 * manuelle par un administrateur.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  // Revue de robustesse (2026-09-11) — sans limitation, cet endpoint permet
  // de spammer indéfiniment des tokens de reset pour un même compte (ou de
  // saturer la base de tokens). Double clé email + IP, même principe que
  // les endpoints de connexion. Ne change rien à la réponse anti-énumération
  // ci-dessous : un email inexistant et un email rate-limité renvoient tous
  // deux un message générique.
  const ip = getClientIp(request.headers);
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit(`forgot-password:email:${parsed.data.email.toLowerCase()}`, { max: 5, windowMs: 15 * 60 * 1000 }),
    checkRateLimit(`forgot-password:ip:${ip}`, { max: 20, windowMs: 15 * 60 * 1000 }),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const resetUrl = await createPasswordResetToken(user.id);
    console.log(`[forgot-password] Lien de reinitialisation pour ${user.email} : ${resetUrl}`);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
