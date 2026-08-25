"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createFinancementSchema,
  updateFinancementStatutSchema,
  updateFinancementDetailsSchema,
  deleteFinancementSchema,
  type CreateFinancementInput,
  type UpdateFinancementStatutInput,
  type UpdateFinancementDetailsInput,
  type DeleteFinancementInput,
} from "@/lib/validations/financement.schema";

export async function createFinancement(input: CreateFinancementInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createFinancementSchema.parse(input);

  const financement = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.financement.create({
      data: {
        projectId: data.projectId,
        bailleur: data.bailleur,
        montant: Number(data.montant),
        statut: data.statut,
        source: data.source,
        dateObtention: data.dateObtention ? new Date(data.dateObtention) : undefined,
        dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : undefined,
        notes: data.notes,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "financement.created",
    entityType: "Financement",
    entityId: financement.id,
    changes: { bailleur: financement.bailleur, montant: financement.montant.toString() },
  });

  revalidatePath(`/projets/${financement.projectId}`);
  revalidatePath("/projets/portefeuille");
  return { ...financement, montant: Number(financement.montant) };
}

export async function updateFinancementStatut(input: UpdateFinancementStatutInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateFinancementStatutSchema.parse(input);

  const financement = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.financement.update({
      where: { id: data.financementId },
      data: {
        statut: data.statut,
        dateObtention:
          data.statut === "OBTENU" ? (data.dateObtention ? new Date(data.dateObtention) : new Date()) : undefined,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "financement.status_updated",
    entityType: "Financement",
    entityId: financement.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/projets/${financement.projectId}`);
  revalidatePath("/projets/portefeuille");
  return { ...financement, montant: Number(financement.montant) };
}

/** Donor/Bailleur Management (§25) — convention, période, exigences de reporting. */
export async function updateFinancementDetails(input: UpdateFinancementDetailsInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateFinancementDetailsSchema.parse(input);

  const financement = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.financement.update({
      where: { id: data.financementId },
      data: {
        source: data.source,
        convention: data.convention,
        periodeDebut: data.periodeDebut ? new Date(data.periodeDebut) : undefined,
        periodeFin: data.periodeFin ? new Date(data.periodeFin) : undefined,
        conditions: data.conditions,
        livrablesRequis: data.livrablesRequis,
        rapportsRequis: data.rapportsRequis,
        indicateursImposes: data.indicateursImposes,
      },
    })
  );

  revalidatePath(`/projets/${financement.projectId}`);
  return { ...financement, montant: Number(financement.montant) };
}

export async function deleteFinancement(input: DeleteFinancementInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteFinancementSchema.parse(input);

  const financement = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.financement.delete({ where: { id: data.financementId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "financement.deleted",
    entityType: "Financement",
    entityId: financement.id,
    changes: { bailleur: financement.bailleur },
  });

  revalidatePath(`/projets/${financement.projectId}`);
  revalidatePath("/projets/portefeuille");
  return { ...financement, montant: Number(financement.montant) };
}
