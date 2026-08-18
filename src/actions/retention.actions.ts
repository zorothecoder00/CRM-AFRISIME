"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { updateRetentionPolicySchema, type UpdateRetentionPolicyInput } from "@/lib/validations/retention.schema";

export async function updateRetentionPolicy(input: UpdateRetentionPolicyInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.DATA_BACKUP_MANAGE);

  const data = updateRetentionPolicySchema.parse(input);
  await prisma.retentionPolicy.upsert({
    where: { dataType: data.dataType },
    update: { retentionDays: data.retentionDays, isActive: data.isActive, updatedById: session.user.id },
    create: { dataType: data.dataType, retentionDays: data.retentionDays, isActive: data.isActive, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "retention_policy.updated",
    entityType: "RetentionPolicy",
    entityId: data.dataType,
    changes: { retentionDays: data.retentionDays, isActive: data.isActive },
  });

  revalidatePath("/administration/donnees");
}
