import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";
import { createPasswordResetToken } from "@/lib/password-reset";

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

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const resetUrl = await createPasswordResetToken(user.id);
    console.log(`[forgot-password] Lien de reinitialisation pour ${user.email} : ${resetUrl}`);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
