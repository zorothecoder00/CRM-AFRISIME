"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/user.schema";
import { createPasswordResetToken } from "@/lib/password-reset";
import { revokeActiveSessionsForUser } from "@/lib/session-revocation";

const SENSITIVE_USER_FIELDS = new Set(["passwordHash", "mfaSecret", "mfaBackupCodes"]);

/** Strip les champs sensibles (hash, secrets MFA) et convertit le Decimal avant de renvoyer un user au client — un Decimal brut fait planter la frontiere Server/Client Component. */
function serializeUser<T extends { capaciteHebdomadaireHeures: unknown }>(user: T) {
  const rest = Object.fromEntries(
    Object.entries(user as Record<string, unknown>).filter(([key]) => !SENSITIVE_USER_FIELDS.has(key))
  );
  return {
    ...rest,
    capaciteHebdomadaireHeures: user.capaciteHebdomadaireHeures !== null ? Number(user.capaciteHebdomadaireHeures) : null,
  };
}

/**
 * Revue de robustesse (2026-09-11) — empêche de retirer le dernier
 * utilisateur actif capable de gérer les comptes (retrait du droit lui-même,
 * changement de rôle, ou désactivation) : sans ce garde-fou, une erreur
 * (ou un abus) peut verrouiller définitivement l'administration de
 * l'organisation, personne ne pouvant plus restaurer l'accès.
 */
async function assertNotLastUserAdmin(excludeUserId: string) {
  const otherAdmin = await prisma.user.findFirst({
    where: {
      id: { not: excludeUserId },
      isActive: true,
      role: { permissions: { some: { permission: { key: PERMISSIONS.ADMINISTRATION_USERS_MANAGE } } } },
    },
    select: { id: true },
  });
  if (!otherAdmin) {
    throw new Error(
      "Impossible : ce compte est le dernier à pouvoir gérer les utilisateurs. Attribuez ce droit à un autre compte avant de continuer."
    );
  }
}

/** Un manager ne peut pas etre son propre subordonne, direct ou indirect (meme principe que assertNoCycle pour Department/Objective/Plan). */
async function assertNoManagerCycle(userId: string, managerId: string) {
  if (managerId === userId) {
    throw new Error("Un collaborateur ne peut pas être son propre manager.");
  }
  let currentId: string | null = managerId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === userId) {
      throw new Error("Ce rattachement créerait une boucle dans la hiérarchie.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    });
    currentId = current?.managerId ?? null;
  }
}

export async function createUser(input: CreateUserInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const data = createUserSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        roleId: data.roleId,
        departmentId: data.departmentId || undefined,
        poste: data.poste || undefined,
        posteId: data.posteId || undefined,
        siteId: data.siteId || undefined,
        managerId: data.managerId || undefined,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Cet email est déjà utilisé par un autre utilisateur.");
    }
    throw err;
  }

  await logAudit({
    userId: session.user.id,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    changes: { email: user.email, roleId: data.roleId },
  });

  revalidatePath("/administration/utilisateurs");
  return serializeUser(user);
}

export async function updateUser(input: UpdateUserInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const data = updateUserSchema.parse(input);

  if (data.managerId) {
    await assertNoManagerCycle(data.id, data.managerId);
  }

  const hasAdminPermission = async (roleId: string) =>
    (await prisma.rolePermission.findFirst({
      where: { roleId, permission: { key: PERMISSIONS.ADMINISTRATION_USERS_MANAGE } },
      select: { roleId: true },
    })) !== null;

  const before = await prisma.user.findUniqueOrThrow({ where: { id: data.id }, select: { roleId: true, isActive: true } });
  const roleChanged = before.roleId !== data.roleId;
  if (roleChanged && before.isActive && (await hasAdminPermission(before.roleId)) && !(await hasAdminPermission(data.roleId))) {
    // Vérifié AVANT d'écrire : si ce compte est le dernier admin et que le
    // nouveau rôle ne porte plus ce droit, le changement ne doit même pas
    // être tenté.
    await assertNotLastUserAdmin(data.id);
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        departmentId: data.departmentId || null,
        poste: data.poste || null,
        posteId: data.posteId || null,
        siteId: data.siteId || null,
        managerId: data.managerId || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Cet email est déjà utilisé par un autre utilisateur.");
    }
    throw err;
  }

  // Un changement de rôle doit s'appliquer immédiatement, pas seulement à
  // la prochaine connexion (voir session-revocation.ts).
  if (roleChanged) {
    await revokeActiveSessionsForUser(user.id, session.user.id);
  }

  await logAudit({
    userId: session.user.id,
    action: "user.updated",
    entityType: "User",
    entityId: user.id,
    changes: { name: user.name, roleId: data.roleId, managerId: data.managerId ?? null },
  });

  revalidatePath("/administration/utilisateurs");
  return serializeUser(user);
}

/**
 * Génère un lien de réinitialisation de mot de passe pour un utilisateur,
 * à transmettre manuellement (WhatsApp, appel...) — aucun fournisseur
 * email/SMS n'est câblé dans cette instance, ce chemin administratif est
 * donc le seul moyen réel de débloquer un utilisateur qui a perdu son mot
 * de passe (voir src/lib/password-reset.ts et le flux self-service
 * /api/auth/forgot-password, qui journalise le lien sans l'envoyer).
 */
export async function generatePasswordResetLink(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true } });
  const resetUrl = await createPasswordResetToken(user.id);

  await logAudit({
    userId: session.user.id,
    action: "user.password_reset_link_generated",
    entityType: "User",
    entityId: user.id,
  });

  return { resetUrl };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.ADMINISTRATION_USERS_MANAGE);

  if (!isActive) {
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
    });
    const isAdmin = target.role.permissions.some((p) => p.permission.key === PERMISSIONS.ADMINISTRATION_USERS_MANAGE);
    if (isAdmin) await assertNotLastUserAdmin(userId);
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });

  // Désactiver un compte doit couper l'accès immédiatement, pas seulement
  // bloquer les futures connexions (voir session-revocation.ts).
  if (!isActive) {
    await revokeActiveSessionsForUser(user.id, session.user.id);
  }

  await logAudit({
    userId: session.user.id,
    action: isActive ? "user.activated" : "user.deactivated",
    entityType: "User",
    entityId: user.id,
  });

  revalidatePath("/administration/utilisateurs");
  return serializeUser(user);
}
