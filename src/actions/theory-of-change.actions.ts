"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createTheoryOfChangeNodeSchema,
  updateTheoryOfChangeNodeSchema,
  deleteTheoryOfChangeNodeSchema,
  type CreateTheoryOfChangeNodeInput,
  type UpdateTheoryOfChangeNodeInput,
  type DeleteTheoryOfChangeNodeInput,
} from "@/lib/validations/theory-of-change.schema";

export async function createTheoryOfChangeNode(input: CreateTheoryOfChangeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createTheoryOfChangeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.theoryOfChangeNode.create({
      data: {
        projectId: data.projectId,
        niveau: data.niveau,
        titre: data.titre,
        description: data.description,
        hypotheses: data.hypotheses,
        risques: data.risques,
        conditions: data.conditions,
        indicateurs: data.indicateurs,
        sourcesVerification: data.sourcesVerification,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "theory_of_change_node.created",
    entityType: "TheoryOfChangeNode",
    entityId: node.id,
    changes: { titre: node.titre, niveau: node.niveau },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return node;
}

export async function updateTheoryOfChangeNode(input: UpdateTheoryOfChangeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateTheoryOfChangeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.theoryOfChangeNode.update({
      where: { id: data.nodeId },
      data: {
        titre: data.titre,
        description: data.description || null,
        hypotheses: data.hypotheses || null,
        risques: data.risques || null,
        conditions: data.conditions || null,
        indicateurs: data.indicateurs || null,
        sourcesVerification: data.sourcesVerification || null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "theory_of_change_node.updated",
    entityType: "TheoryOfChangeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}

export async function deleteTheoryOfChangeNode(input: DeleteTheoryOfChangeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteTheoryOfChangeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.theoryOfChangeNode.delete({ where: { id: data.nodeId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "theory_of_change_node.deleted",
    entityType: "TheoryOfChangeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}
