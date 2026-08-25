"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createFundingOpportunitySchema,
  linkFundingOpportunityToProjectSchema,
  deleteFundingOpportunitySchema,
  type CreateFundingOpportunityInput,
  type LinkFundingOpportunityToProjectInput,
  type DeleteFundingOpportunityInput,
} from "@/lib/validations/funding-opportunity.schema";

/** Appel à projets / Funding Opportunity (Project Studio §26). */
export async function createFundingOpportunity(input: CreateFundingOpportunityInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = createFundingOpportunitySchema.parse(input);

  const opportunity = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.fundingOpportunity.create({
      data: {
        projectId: data.projectId,
        bailleur: data.bailleur,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        budgetDisponible: data.budgetDisponible ? Number(data.budgetDisponible) : undefined,
        paysEligibles: data.paysEligibles,
        secteurs: data.secteurs,
        beneficiaires: data.beneficiaires,
        criteres: data.criteres,
        documents: data.documents,
        exigences: data.exigences,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "funding_opportunity.created",
    entityType: "FundingOpportunity",
    entityId: opportunity.id,
    changes: { bailleur: opportunity.bailleur },
  });

  revalidatePath("/projets/appels-a-projets");
  if (data.projectId) revalidatePath(`/projets/${data.projectId}`);
  return { ...opportunity, budgetDisponible: opportunity.budgetDisponible ? Number(opportunity.budgetDisponible) : null };
}

export async function linkFundingOpportunityToProject(input: LinkFundingOpportunityToProjectInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = linkFundingOpportunityToProjectSchema.parse(input);

  const opportunity = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.fundingOpportunity.update({
      where: { id: data.fundingOpportunityId },
      data: { projectId: data.projectId },
    })
  );

  revalidatePath("/projets/appels-a-projets");
  revalidatePath(`/projets/${data.projectId}`);
  return { ...opportunity, budgetDisponible: opportunity.budgetDisponible ? Number(opportunity.budgetDisponible) : null };
}

export async function deleteFundingOpportunity(input: DeleteFundingOpportunityInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteFundingOpportunitySchema.parse(input);

  const opportunity = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.fundingOpportunity.delete({ where: { id: data.fundingOpportunityId } })
  );

  revalidatePath("/projets/appels-a-projets");
  if (opportunity.projectId) revalidatePath(`/projets/${opportunity.projectId}`);
  return { ...opportunity, budgetDisponible: opportunity.budgetDisponible ? Number(opportunity.budgetDisponible) : null };
}
