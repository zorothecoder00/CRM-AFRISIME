"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generateApiKey } from "@/lib/api-keys";
import { createApiKeySchema, type CreateApiKeyInput } from "@/lib/validations/api-key.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

// Retourne le texte en clair une seule fois — jamais relisible ensuite
// (voir src/lib/api-keys.ts, seul le hash est stocké).
export async function createApiKey(input: CreateApiKeyInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.API_MANAGE);

  const data = createApiKeySchema.parse(input);
  const { plaintext, prefix, hash } = generateApiKey();

  const key = await prisma.apiKey.create({
    data: {
      nom: data.nom,
      keyPrefix: prefix,
      keyHash: hash,
      permissions: data.permissions,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "apikey.created",
    entityType: "ApiKey",
    entityId: key.id,
    changes: { nom: data.nom, permissions: data.permissions },
  });

  revalidatePath("/administration/api-keys");
  return { id: key.id, plaintext };
}

export async function revokeApiKey(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.API_MANAGE);

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });

  await logAudit({ userId: session.user.id, action: "apikey.revoked", entityType: "ApiKey", entityId: id });

  revalidatePath("/administration/api-keys");
}
