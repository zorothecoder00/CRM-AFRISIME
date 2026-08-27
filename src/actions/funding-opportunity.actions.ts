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
  convertFundingOpportunitySchema,
  type CreateFundingOpportunityInput,
  type LinkFundingOpportunityToProjectInput,
  type DeleteFundingOpportunityInput,
  type ConvertFundingOpportunityInput,
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

/** Conversion Appel à projets → Project une fois l'opportunité formalisée (miroir de convertOpportunityToProject). */
export async function convertFundingOpportunityToProject(input: ConvertFundingOpportunityInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = convertFundingOpportunitySchema.parse(input);

  const opportunity = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.fundingOpportunity.findUniqueOrThrow({ where: { id: data.fundingOpportunityId } })
  );

  if (opportunity.projectId) {
    throw new Error("Cet appel à projets est déjà lié à un projet.");
  }

  const project = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.project.create({
      data: {
        nom: opportunity.bailleur,
        description: `Appel à projets formalisé — ${opportunity.bailleur}`,
        responsableId: data.responsableId,
        departmentId: data.departmentId,
        budget: opportunity.budgetDisponible ?? undefined,
        dateFin: opportunity.deadline ?? undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
        members: {
          create: [{ userId: data.responsableId, roleOnProject: "CHEF_PROJET", organizationId: session.user.organizationId }],
        },
      },
    })
  );

  await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.fundingOpportunity.update({ where: { id: opportunity.id }, data: { projectId: project.id } })
  );

  await logAudit({
    userId: session.user.id,
    action: "funding_opportunity.converted_to_project",
    entityType: "FundingOpportunity",
    entityId: opportunity.id,
    changes: { projectId: project.id },
  });

  revalidatePath("/projets/appels-a-projets");
  revalidatePath("/projets");
  revalidatePath("/projets/portefeuille");
  return { id: project.id };
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
