import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { portalActivateSchema } from "@/lib/validations/portal-auth.schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = portalActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const inviteToken = await prisma.portalInviteToken.findUnique({ where: { tokenHash } });

  if (!inviteToken || inviteToken.usedAt || inviteToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Lien d'activation invalide ou expiré." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.portalAccount.update({
      where: { id: inviteToken.portalAccountId },
      data: { passwordHash, activatedAt: new Date() },
    }),
    prisma.portalInviteToken.update({ where: { id: inviteToken.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ message: "Accès activé avec succès." });
}
