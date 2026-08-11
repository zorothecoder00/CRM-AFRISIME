"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { confirmMfaSchema, disableMfaSchema } from "@/lib/validations/security.schema";
import { encryptSecret } from "@/lib/crypto";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString("hex"));
}

/** Génère un secret TOTP + QR code, sans le persister (persisté seulement après confirmMfaSetup). */
export async function initiateMfaSetup() {
  const session = await requireSession();
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(session.user.email ?? session.user.id, "AfriFlow", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(uri);
  return { secret, qrCodeDataUrl };
}

export async function confirmMfaSetup(input: { secret: string; code: string }) {
  const session = await requireSession();
  const data = confirmMfaSchema.parse(input);

  const isValid = authenticator.verify({ token: data.code, secret: data.secret });
  if (!isValid) throw new Error("Code de vérification invalide.");

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      mfaSecret: encryptSecret(data.secret),
      mfaBackupCodes: hashedBackupCodes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "security.mfa_enabled",
      entityType: "User",
      entityId: session.user.id,
    },
  });

  revalidatePath("/parametres/securite");
  return { backupCodes };
}

export async function disableMfa(input: { password: string }) {
  const session = await requireSession();
  const data = disableMfaSchema.parse(input);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) throw new Error("Mot de passe incorrect.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: Prisma.JsonNull },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "security.mfa_disabled",
      entityType: "User",
      entityId: session.user.id,
    },
  });

  revalidatePath("/parametres/securite");
}
