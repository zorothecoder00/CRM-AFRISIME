"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { suggestCommunicationPlanEntries } from "@/lib/communication-plan";
import {
  createCommunicationPlanEntrySchema,
  generateCommunicationPlanSchema,
  deleteCommunicationPlanEntrySchema,
  type CreateCommunicationPlanEntryInput,
  type GenerateCommunicationPlanInput,
  type DeleteCommunicationPlanEntryInput,
} from "@/lib/validations/communication-plan.schema";

/** Communication Plan (Project Studio §36). */
export async function createCommunicationPlanEntry(input: CreateCommunicationPlanEntryInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createCommunicationPlanEntrySchema.parse(input);

  const entry = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.communicationPlanEntry.create({
      data: {
        projectId: data.projectId,
        stakeholderId: data.stakeholderId,
        public: data.public,
        message: data.message,
        canal: data.canal,
        frequence: data.frequence,
        responsableId: data.responsableId,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  revalidatePath(`/projets/${data.projectId}`);
  return entry;
}

/**
 * "Construire automatiquement le plan de communication" (§36) — pre-remplit
 * une entree par partie prenante deja qualifiee (§9) pas encore couverte,
 * suggeree via suggestCommunicationPlanEntries (quadrant influence/interet).
 * N'ecrase jamais une entree existante ; idempotent d'un appel a l'autre.
 */
export async function generateCommunicationPlan(input: GenerateCommunicationPlanInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = generateCommunicationPlanSchema.parse(input);
  const suggestions = await suggestCommunicationPlanEntries(data.projectId);

  if (suggestions.length === 0) {
    return { created: 0 };
  }

  const created = await withTenantScopedSession(session.user.organizationId, (tx) =>
    Promise.all(
      suggestions.map((s) =>
        tx.communicationPlanEntry.create({
          data: {
            projectId: data.projectId,
            stakeholderId: s.stakeholderId,
            public: s.public,
            message: s.message,
            canal: s.canal,
            frequence: s.frequence,
            responsableId: s.responsableId ?? undefined,
            createdById: session.user.id,
            organizationId: session.user.organizationId,
          },
        })
      )
    )
  );

  await logAudit({
    userId: session.user.id,
    action: "communication_plan.generated",
    entityType: "Project",
    entityId: data.projectId,
    changes: { count: created.length },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { created: created.length };
}

export async function deleteCommunicationPlanEntry(input: DeleteCommunicationPlanEntryInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteCommunicationPlanEntrySchema.parse(input);

  const entry = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.communicationPlanEntry.delete({ where: { id: data.entryId } })
  );

  revalidatePath(`/projets/${entry.projectId}`);
  return entry;
}
