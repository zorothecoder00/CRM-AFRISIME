"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createIntegrationSchema,
  updateIntegrationStatusSchema,
  type CreateIntegrationInput,
} from "@/lib/validations/integration.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createIntegration(input: CreateIntegrationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.INTEGRATION_MANAGE);

  const data = createIntegrationSchema.parse(input);

  const integration = await prisma.integration.create({
    data: {
      nom: data.nom,
      type: data.type,
      apiKey: data.apiKey || undefined,
      webhookUrl: data.webhookUrl || undefined,
      description: data.description,
      createdById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "integration.created",
      entityType: "Integration",
      entityId: integration.id,
    },
  });

  revalidatePath("/administration/integrations");
  return integration;
}

export async function updateIntegrationStatus(integrationId: string, statut: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.INTEGRATION_MANAGE);

  const data = updateIntegrationStatusSchema.parse({ integrationId, statut });

  const integration = await prisma.integration.update({
    where: { id: data.integrationId },
    data: { statut: data.statut },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "integration.status_changed",
      entityType: "Integration",
      entityId: integration.id,
      changes: { statut: data.statut },
    },
  });

  revalidatePath("/administration/integrations");
  return integration;
}

export async function deleteIntegration(integrationId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.INTEGRATION_MANAGE);

  await prisma.integration.delete({ where: { id: integrationId } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "integration.deleted",
      entityType: "Integration",
      entityId: integrationId,
    },
  });

  revalidatePath("/administration/integrations");
}
