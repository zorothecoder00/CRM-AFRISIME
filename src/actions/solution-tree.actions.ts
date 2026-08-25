"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  generateSolutionTreeSchema,
  createSolutionTreeNodeSchema,
  updateSolutionTreeNodeSchema,
  deleteSolutionTreeNodeSchema,
  reorderSolutionTreeNodesSchema,
  type GenerateSolutionTreeInput,
  type CreateSolutionTreeNodeInput,
  type UpdateSolutionTreeNodeInput,
  type DeleteSolutionTreeNodeInput,
  type ReorderSolutionTreeNodesInput,
} from "@/lib/validations/solution-tree.schema";

const PROBLEM_TO_SOLUTION_TYPE = {
  PROBLEME_CENTRAL: "OBJECTIF_GLOBAL",
  CAUSE_DIRECTE: "SOLUTION",
  CAUSE_PROFONDE: "SOLUTION",
  CONSEQUENCE: "RESULTAT_ATTENDU",
} as const;

/**
 * Génération depuis le Problem Tree (Project Studio §8) — un noeud par noeud
 * du Problem Tree, meme structure parent/enfant, type reconverti (voir
 * PROBLEM_TO_SOLUTION_TYPE). Traite les noeuds par vagues (racine d'abord,
 * puis chaque generation dont le parent vient d'etre mappe) plutot qu'un
 * simple tri sur `ordre`, car un Problem Tree n'a pas de garantie que les
 * parents apparaissent avant leurs enfants dans cet ordre.
 */
export async function generateSolutionTreeFromProblemTree(input: GenerateSolutionTreeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = generateSolutionTreeSchema.parse(input);

  const created = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existingCount = await tx.solutionTreeNode.count({ where: { projectId: data.projectId } });
    if (existingCount > 0) {
      throw new Error("Un arbre des solutions existe déjà pour ce projet.");
    }

    const problemNodes = await tx.problemTreeNode.findMany({
      where: { projectId: data.projectId },
      orderBy: { ordre: "asc" },
    });
    if (problemNodes.length === 0) {
      throw new Error("Aucun arbre des problèmes à convertir.");
    }

    const idMap = new Map<string, string>();
    const remaining = [...problemNodes];
    const createdNodes = [];

    while (remaining.length > 0) {
      const ready = remaining.filter((n) => !n.parentId || idMap.has(n.parentId));
      if (ready.length === 0) break;

      for (const node of ready) {
        const solutionNode = await tx.solutionTreeNode.create({
          data: {
            projectId: data.projectId,
            problemNodeId: node.id,
            parentId: node.parentId ? idMap.get(node.parentId) : undefined,
            type: PROBLEM_TO_SOLUTION_TYPE[node.type],
            titre: node.titre,
            createdById: session.user.id,
            organizationId: session.user.organizationId,
          },
        });
        idMap.set(node.id, solutionNode.id);
        createdNodes.push(solutionNode);
      }

      for (const node of ready) {
        const index = remaining.indexOf(node);
        if (index >= 0) remaining.splice(index, 1);
      }
    }

    return createdNodes;
  });

  await logAudit({
    userId: session.user.id,
    action: "solution_tree.generated",
    entityType: "Project",
    entityId: data.projectId,
    changes: { nodeCount: created.length },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return created;
}

export async function createSolutionTreeNode(input: CreateSolutionTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createSolutionTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.solutionTreeNode.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId || undefined,
        type: data.type,
        titre: data.titre,
        description: data.description,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "solution_tree_node.created",
    entityType: "SolutionTreeNode",
    entityId: node.id,
    changes: { titre: node.titre, type: node.type },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return node;
}

export async function updateSolutionTreeNode(input: UpdateSolutionTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateSolutionTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.solutionTreeNode.update({
      where: { id: data.nodeId },
      data: { titre: data.titre, description: data.description || null },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "solution_tree_node.updated",
    entityType: "SolutionTreeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}

export async function deleteSolutionTreeNode(input: DeleteSolutionTreeNodeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteSolutionTreeNodeSchema.parse(input);

  const node = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.solutionTreeNode.delete({ where: { id: data.nodeId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "solution_tree_node.deleted",
    entityType: "SolutionTreeNode",
    entityId: node.id,
    changes: { titre: node.titre },
  });

  revalidatePath(`/projets/${node.projectId}`);
  return node;
}

export async function reorderSolutionTreeNodes(input: ReorderSolutionTreeNodesInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = reorderSolutionTreeNodesSchema.parse(input);

  await withTenantScopedSession(session.user.organizationId, (tx) =>
    Promise.all(data.nodeIds.map((id, index) => tx.solutionTreeNode.update({ where: { id }, data: { ordre: index } })))
  );

  revalidatePath(`/projets/${data.projectId}`);
}
