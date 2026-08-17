"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { runContractCreatedRules } from "@/lib/automation";
import { createContractSchema, type CreateContractInput } from "@/lib/validations/contract.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Comble V2.2 §7.1 "nouveau contrat" : portée minimale (voir commentaire du
 * modèle Contract) — juste assez pour déclencher CONTRACT_CREATED.
 */
export async function createContract(input: CreateContractInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);

  const data = createContractSchema.parse(input);

  const contract = await prisma.contract.create({
    data: {
      nom: data.nom,
      opportunityId: data.opportunityId || undefined,
      organizationId: data.organizationId || undefined,
      montant: data.montant ? Number(data.montant) : undefined,
      dateSignature: data.dateSignature ? new Date(data.dateSignature) : undefined,
      dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "contract.created",
    entityType: "Contract",
    entityId: contract.id,
    changes: { nom: contract.nom },
  });

  await runContractCreatedRules({
    id: contract.id,
    nom: contract.nom,
    createdById: contract.createdById,
    montant: contract.montant ? Number(contract.montant) : null,
  });

  if (data.opportunityId) revalidatePath(`/crm/opportunites/${data.opportunityId}`);
  if (data.organizationId) revalidatePath(`/crm/organisations/${data.organizationId}`);
  return { id: contract.id };
}
