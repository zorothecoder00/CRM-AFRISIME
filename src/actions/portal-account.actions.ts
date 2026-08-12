"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createPortalAccountSchema, type CreatePortalAccountInput } from "@/lib/validations/portal-account.schema";

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

function buildActivationUrl(rawToken: string) {
  return `${process.env.NEXTAUTH_URL ?? ""}/portail/activer?token=${rawToken}`;
}

async function issueInviteToken(portalAccountId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.portalInviteToken.create({
    data: {
      portalAccountId,
      tokenHash,
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    },
  });

  return buildActivationUrl(rawToken);
}

export async function createPortalAccount(input: CreatePortalAccountInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = createPortalAccountSchema.parse(input);

  const contact = await prisma.crmContact.findUniqueOrThrow({ where: { id: data.contactId } });
  if (!contact.email) {
    throw new Error("Le contact doit avoir un email pour créer un accès portail.");
  }

  const account = await prisma.portalAccount.create({
    data: {
      contactId: contact.id,
      email: contact.email,
      invitedById: session.user.id,
    },
  });

  const activationUrl = await issueInviteToken(account.id);

  await logAudit({
    userId: session.user.id,
    action: "portal_account.created",
    entityType: "PortalAccount",
    entityId: account.id,
    changes: { contactId: contact.id, email: account.email },
  });

  revalidatePath(`/crm/contacts/${contact.id}`);
  return { account, activationUrl };
}

export async function resendPortalInvite(portalAccountId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);

  const account = await prisma.portalAccount.findUniqueOrThrow({ where: { id: portalAccountId } });
  if (account.activatedAt) {
    throw new Error("Cet accès est déjà activé.");
  }

  const activationUrl = await issueInviteToken(account.id);

  await logAudit({
    userId: session.user.id,
    action: "portal_account.invite_resent",
    entityType: "PortalAccount",
    entityId: account.id,
    changes: {},
  });

  revalidatePath(`/crm/contacts/${account.contactId}`);
  return { activationUrl };
}

export async function revokePortalAccess(portalAccountId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);

  const account = await prisma.portalAccount.update({
    where: { id: portalAccountId },
    data: { isActive: false },
  });

  await logAudit({
    userId: session.user.id,
    action: "portal_account.revoked",
    entityType: "PortalAccount",
    entityId: account.id,
    changes: {},
  });

  revalidatePath(`/crm/contacts/${account.contactId}`);
  return account;
}

export async function reactivatePortalAccess(portalAccountId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);

  const account = await prisma.portalAccount.update({
    where: { id: portalAccountId },
    data: { isActive: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "portal_account.reactivated",
    entityType: "PortalAccount",
    entityId: account.id,
    changes: {},
  });

  revalidatePath(`/crm/contacts/${account.contactId}`);
  return account;
}
