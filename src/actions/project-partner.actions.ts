"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  linkProjectPartnerSchema,
  updateProjectPartnerSchema,
  unlinkProjectPartnerSchema,
  type LinkProjectPartnerInput,
  type UpdateProjectPartnerInput,
  type UnlinkProjectPartnerInput,
} from "@/lib/validations/project-partner.schema";

/**
 * Partenaires structurés d'un projet (Project Studio §62, Project
 * Governance — "définir : ... partenaires"), distincts du roster
 * ProjectMember (équipe/gouvernance interne).
 */
export async function linkProjectPartner(input: LinkProjectPartnerInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = linkProjectPartnerSchema.parse(input);

  const partner = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectPartner.upsert({
      where: { projectId_crmOrganizationId: { projectId: data.projectId, crmOrganizationId: data.crmOrganizationId } },
      update: { role: data.role || null, notes: data.notes || null },
      create: {
        projectId: data.projectId,
        crmOrganizationId: data.crmOrganizationId,
        role: data.role || undefined,
        notes: data.notes || undefined,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_partner.linked",
    entityType: "ProjectPartner",
    entityId: partner.id,
    changes: { projectId: data.projectId, crmOrganizationId: data.crmOrganizationId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { id: partner.id };
}

export async function updateProjectPartner(input: UpdateProjectPartnerInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectPartnerSchema.parse(input);

  const partner = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectPartner.update({
      where: { id: data.partnerId },
      data: { role: data.role || null, notes: data.notes || null },
    })
  );

  revalidatePath(`/projets/${partner.projectId}`);
  return { id: partner.id };
}

export async function unlinkProjectPartner(input: UnlinkProjectPartnerInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = unlinkProjectPartnerSchema.parse(input);

  const partner = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectPartner.delete({ where: { id: data.partnerId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_partner.unlinked",
    entityType: "ProjectPartner",
    entityId: data.partnerId,
    changes: { projectId: partner.projectId },
  });

  revalidatePath(`/projets/${partner.projectId}`);
}
