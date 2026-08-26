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
  linkProblemTreeNodeDocumentSchema,
  unlinkProblemTreeNodeDocumentSchema,
  linkProblemTreeNodeIndicatorSchema,
  unlinkProblemTreeNodeIndicatorSchema,
  addProblemTreeNodeCommentSchema,
  deleteProblemTreeNodeCommentSchema,
  type CreateProblemTreeNodeInput,
  type UpdateProblemTreeNodeInput,
  type DeleteProblemTreeNodeInput,
  type ReorderProblemTreeNodesInput,
  type LinkProblemTreeNodeDocumentInput,
  type UnlinkProblemTreeNodeDocumentInput,
  type LinkProblemTreeNodeIndicatorInput,
  type UnlinkProblemTreeNodeIndicatorInput,
  type AddProblemTreeNodeCommentInput,
  type DeleteProblemTreeNodeCommentInput,
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

// ---- Liens (Project Studio §7 — données/documents/indicateurs/commentaires) ----

export async function linkProblemTreeNodeDocument(input: LinkProblemTreeNodeDocumentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = linkProblemTreeNodeDocumentSchema.parse(input);

  const link = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const node = await tx.problemTreeNode.findUniqueOrThrow({ where: { id: data.nodeId }, select: { projectId: true } });
    return tx.problemTreeNodeDocument.create({
      data: { nodeId: data.nodeId, documentId: data.documentId, organizationId: session.user.organizationId },
      include: { document: { select: { nom: true } } },
    }).then((created) => ({ ...created, projectId: node.projectId }));
  });

  revalidatePath(`/projets/${link.projectId}`);
  return link;
}

export async function unlinkProblemTreeNodeDocument(input: UnlinkProblemTreeNodeDocumentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = unlinkProblemTreeNodeDocumentSchema.parse(input);

  const link = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.problemTreeNodeDocument.findUniqueOrThrow({
      where: { id: data.linkId },
      include: { node: { select: { projectId: true } } },
    });
    await tx.problemTreeNodeDocument.delete({ where: { id: data.linkId } });
    return existing;
  });

  revalidatePath(`/projets/${link.node.projectId}`);
  return link;
}

export async function linkProblemTreeNodeIndicator(input: LinkProblemTreeNodeIndicatorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = linkProblemTreeNodeIndicatorSchema.parse(input);

  const link = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const node = await tx.problemTreeNode.findUniqueOrThrow({ where: { id: data.nodeId }, select: { projectId: true } });
    const created = await tx.problemTreeNodeIndicator.create({
      data: { nodeId: data.nodeId, indicatorId: data.indicatorId, organizationId: session.user.organizationId },
    });
    return { ...created, projectId: node.projectId };
  });

  revalidatePath(`/projets/${link.projectId}`);
  return link;
}

export async function unlinkProblemTreeNodeIndicator(input: UnlinkProblemTreeNodeIndicatorInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = unlinkProblemTreeNodeIndicatorSchema.parse(input);

  const link = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.problemTreeNodeIndicator.findUniqueOrThrow({
      where: { id: data.linkId },
      include: { node: { select: { projectId: true } } },
    });
    await tx.problemTreeNodeIndicator.delete({ where: { id: data.linkId } });
    return existing;
  });

  revalidatePath(`/projets/${link.node.projectId}`);
  return link;
}

export async function addProblemTreeNodeComment(input: AddProblemTreeNodeCommentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = addProblemTreeNodeCommentSchema.parse(input);

  const comment = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const node = await tx.problemTreeNode.findUniqueOrThrow({ where: { id: data.nodeId }, select: { projectId: true } });
    const created = await tx.problemTreeNodeComment.create({
      data: {
        nodeId: data.nodeId,
        authorId: session.user.id,
        content: data.content,
        organizationId: session.user.organizationId,
      },
    });
    return { ...created, projectId: node.projectId };
  });

  revalidatePath(`/projets/${comment.projectId}`);
  return comment;
}

export async function deleteProblemTreeNodeComment(input: DeleteProblemTreeNodeCommentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProblemTreeNodeCommentSchema.parse(input);

  const comment = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.problemTreeNodeComment.findUniqueOrThrow({
      where: { id: data.commentId },
      include: { node: { select: { projectId: true } } },
    });
    await tx.problemTreeNodeComment.delete({ where: { id: data.commentId } });
    return existing;
  });

  revalidatePath(`/projets/${comment.node.projectId}`);
  return comment;
}
