import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";

const TOKEN_TTL_MS = 60 * 60 * 1000;

// Reponse volontairement identique que l'email corresponde a un compte ou
// non, pour ne pas permettre a un attaquant de decouvrir quels emails sont
// enregistres (anti-enumeration).
const GENERIC_MESSAGE = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    // TODO: envoyer rawToken par email une fois un fournisseur (Resend/SMTP)
    // configure. En attendant, le lien est logue cote serveur pour permettre
    // de tester le flux de reinitialisation.
    const resetUrl = `${process.env.NEXTAUTH_URL ?? ""}/reset-password?token=${rawToken}`;
    console.log(`[forgot-password] Lien de reinitialisation pour ${user.email} : ${resetUrl}`);
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
