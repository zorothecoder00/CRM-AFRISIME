"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProcurementItemSchema,
  updateProcurementItemStatutSchema,
  deleteProcurementItemSchema,
  type CreateProcurementItemInput,
  type UpdateProcurementItemStatutInput,
  type DeleteProcurementItemInput,
} from "@/lib/validations/procurement.schema";

/** Procurement Plan (Project Studio §34). */
export async function createProcurementItem(input: CreateProcurementItemInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProcurementItemSchema.parse(input);

  const item = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.procurementItem.create({
      data: {
        projectId: data.projectId,
        besoin: data.besoin,
        specifications: data.specifications,
        quantite: data.quantite ? Number(data.quantite) : undefined,
        budget: data.budget ? Number(data.budget) : undefined,
        fournisseurId: data.fournisseurId,
        methodeAchat: data.methodeAchat,
        echeance: data.echeance ? new Date(data.echeance) : undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "procurement_item.created",
    entityType: "ProcurementItem",
    entityId: item.id,
    changes: { besoin: item.besoin, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return {
    ...item,
    quantite: item.quantite ? Number(item.quantite) : null,
    budget: item.budget ? Number(item.budget) : null,
  };
}

export async function updateProcurementItemStatut(input: UpdateProcurementItemStatutInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProcurementItemStatutSchema.parse(input);

  const item = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.procurementItem.update({ where: { id: data.procurementItemId }, data: { statut: data.statut } })
  );

  revalidatePath(`/projets/${item.projectId}`);
  return {
    ...item,
    quantite: item.quantite ? Number(item.quantite) : null,
    budget: item.budget ? Number(item.budget) : null,
  };
}

export async function deleteProcurementItem(input: DeleteProcurementItemInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProcurementItemSchema.parse(input);

  const item = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.procurementItem.delete({ where: { id: data.procurementItemId } })
  );

  revalidatePath(`/projets/${item.projectId}`);
  return {
    ...item,
    quantite: item.quantite ? Number(item.quantite) : null,
    budget: item.budget ? Number(item.budget) : null,
  };
}
