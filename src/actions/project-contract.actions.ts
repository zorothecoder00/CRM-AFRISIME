"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProjectContractSchema,
  updateProjectContractStatutSchema,
  evaluateProjectContractSchema,
  linkDeliverableToContractSchema,
  createContractPaymentSchema,
  updateContractPaymentStatutSchema,
  type CreateProjectContractInput,
  type UpdateProjectContractStatutInput,
  type EvaluateProjectContractInput,
  type LinkDeliverableToContractInput,
  type CreateContractPaymentInput,
  type UpdateContractPaymentStatutInput,
} from "@/lib/validations/project-contract.schema";

/** Contract Management (Project Studio §35). */
export async function createProjectContract(input: CreateProjectContractInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectContractSchema.parse(input);

  const contract = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectContract.create({
      data: {
        projectId: data.projectId,
        fournisseurId: data.fournisseurId,
        nom: data.nom,
        montant: data.montant ? Number(data.montant) : undefined,
        dateSignature: data.dateSignature ? new Date(data.dateSignature) : undefined,
        dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_contract.created",
    entityType: "ProjectContract",
    entityId: contract.id,
    changes: { nom: contract.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { ...contract, montant: contract.montant ? Number(contract.montant) : null };
}

export async function updateProjectContractStatut(input: UpdateProjectContractStatutInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectContractStatutSchema.parse(input);

  const contract = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectContract.update({ where: { id: data.contractId }, data: { statut: data.statut } })
  );

  revalidatePath(`/projets/${contract.projectId}`);
  return { ...contract, montant: contract.montant ? Number(contract.montant) : null };
}

export async function evaluateProjectContract(input: EvaluateProjectContractInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = evaluateProjectContractSchema.parse(input);

  const contract = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectContract.update({
      where: { id: data.contractId },
      data: { evaluationNote: data.evaluationNote, evaluationCommentaire: data.evaluationCommentaire },
    })
  );

  revalidatePath(`/projets/${contract.projectId}`);
  return { ...contract, montant: contract.montant ? Number(contract.montant) : null };
}

export async function linkDeliverableToContract(input: LinkDeliverableToContractInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = linkDeliverableToContractSchema.parse(input);

  const deliverable = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDeliverable.update({ where: { id: data.deliverableId }, data: { contractId: data.contractId } })
  );

  revalidatePath(`/projets/${deliverable.projectId}`);
  return deliverable;
}

export async function createContractPayment(input: CreateContractPaymentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createContractPaymentSchema.parse(input);

  const { payment, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const contract = await tx.projectContract.findUniqueOrThrow({ where: { id: data.contractId } });
    const created = await tx.projectContractPayment.create({
      data: {
        contractId: data.contractId,
        montant: Number(data.montant),
        datePaiement: data.datePaiement ? new Date(data.datePaiement) : undefined,
        statut: data.statut,
        reference: data.reference,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });
    return { payment: created, projectId: contract.projectId };
  });

  revalidatePath(`/projets/${projectId}`);
  return { ...payment, montant: Number(payment.montant) };
}

export async function updateContractPaymentStatut(input: UpdateContractPaymentStatutInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateContractPaymentStatutSchema.parse(input);

  const { payment, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const updated = await tx.projectContractPayment.update({
      where: { id: data.paymentId },
      data: { statut: data.statut },
      include: { contract: { select: { projectId: true } } },
    });
    return { payment: updated, projectId: updated.contract.projectId };
  });

  revalidatePath(`/projets/${projectId}`);
  return { ...payment, montant: Number(payment.montant) };
}
