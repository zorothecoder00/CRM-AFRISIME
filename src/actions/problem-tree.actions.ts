"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProblemTreeNodeSchema,
  updateProblemTreeNodeSchema,
  deleteProblemTreeNodeSchema,
  reorderProblemTreeNodesSchema,
  type CreateProblemTreeNodeInput,
  type UpdateProblemTreeNodeInput,
  type DeleteProblemTreeNodeInput,
  type ReorderProblemTreeNodesInput,
} from "@/lib/validations/problem-tree.schema";

export async function createProblemTreeNode(input: CreateProblemTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProblemTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.problemTreeNode.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId || undefined,
        type: data.type,
        titre: data.titre,
        description: data.description,
        sources: data.sources,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "problem_tree_node.created",
    entityType: "ProblemTreeNode",
    entityId: node.id,
    changes: { titre: node.titre, type: node.type },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return node;
}

export async function updateProblemTreeNode(input: UpdateProblemTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProblemTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.problemTreeNode.update({
      where: { id: data.nodeId },
      data: { titre: data.titre, description: data.description || null, sources: data.sources || null },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "problem_tree_node.updated",
    entityType: "ProblemTreeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}

export async function deleteProblemTreeNode(input: DeleteProblemTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProblemTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.problemTreeNode.delete({ where: { id: data.nodeId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "problem_tree_node.deleted",
    entityType: "ProblemTreeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}

/** Réordonnancement par glisser-déposer, limité aux frères d'un même parent (voir EtapesDesigner). */
export async function reorderProblemTreeNodes(input: ReorderProblemTreeNodesInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = reorderProblemTreeNodesSchema.parse(input);

  await withTenantScopedSession(session.user.organizationId, (tx) =>
    Promise.all(data.nodeIds.map((id, index) => tx.problemTreeNode.update({ where: { id }, data: { ordre: index } })))
  );

  revalidatePath(`/projets/${data.projectId}`);
}
