"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  generateLogframeSchema,
  createLogframeRowSchema,
  updateLogframeRowSchema,
  deleteLogframeRowSchema,
  type GenerateLogframeInput,
  type CreateLogframeRowInput,
  type UpdateLogframeRowInput,
  type DeleteLogframeRowInput,
} from "@/lib/validations/logframe.schema";

const TOC_TO_LOGFRAME_LEVEL = {
  IMPACT: "IMPACT",
  OUTCOME: "OUTCOME",
  OUTPUT: "OUTPUT",
  ACTIVITE: "ACTIVITES",
} as const;

/**
 * Project Studio §65 (Single Source of Truth) — depuis la bascule en
 * synchronisation directe, chaque noeud ToC (hors INPUT) génère/entretient
 * automatiquement sa ligne de Cadre logique dès sa création (voir
 * createTheoryOfChangeNode/updateTheoryOfChangeNode dans
 * theory-of-change.actions.ts). Cette action ne sert donc plus qu'à
 * rattraper les noeuds créés avant l'activation de la synchronisation —
 * idempotente, elle ne crée que les lignes manquantes.
 */
export async function generateLogframeFromTheoryOfChange(input: GenerateLogframeInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = generateLogframeSchema.parse(input);

  const created = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const tocNodes = await tx.theoryOfChangeNode.findMany({
      where: { projectId: data.projectId, niveau: { not: "INPUT" } },
      include: { logframeRow: true },
      orderBy: { ordre: "asc" },
    });
    const missing = tocNodes.filter((n) => !n.logframeRow);
    if (missing.length === 0) {
      throw new Error("Toutes les lignes sont déjà synchronisées avec la théorie du changement.");
    }

    const startingOrdre = await tx.logframeRow.count({ where: { projectId: data.projectId } });
    const rows = [];
    for (const [i, node] of missing.entries()) {
      const row = await tx.logframeRow.create({
        data: {
          projectId: data.projectId,
          theoryOfChangeNodeId: node.id,
          niveau: TOC_TO_LOGFRAME_LEVEL[node.niveau as keyof typeof TOC_TO_LOGFRAME_LEVEL],
          resultats: node.titre,
          indicateurs: node.indicateurs,
          sources: node.sourcesVerification,
          hypotheses: node.hypotheses,
          ordre: startingOrdre + i,
          createdById: session.user.id,
          organizationId: session.user.organizationId,
        },
      });
      rows.push(row);
    }
    return rows;
  });

  await logAudit({
    userId: session.user.id,
    action: "logframe.generated",
    entityType: "Project",
    entityId: data.projectId,
    changes: { rowCount: created.length },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return created;
}

export async function createLogframeRow(input: CreateLogframeRowInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createLogframeRowSchema.parse(input);

  const row = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.logframeRow.create({
      data: {
        projectId: data.projectId,
        niveau: data.niveau,
        resultats: data.resultats,
        indicateurs: data.indicateurs,
        sources: data.sources,
        hypotheses: data.hypotheses,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  revalidatePath(`/projets/${data.projectId}`);
  return row;
}

export async function updateLogframeRow(input: UpdateLogframeRowInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateLogframeRowSchema.parse(input);

  const row = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.logframeRow.findUniqueOrThrow({ where: { id: data.rowId } });
    if (existing.theoryOfChangeNodeId) {
      throw new Error("Cette ligne est synchronisée avec la théorie du changement — modifiez le noeud ToC correspondant.");
    }
    return tx.logframeRow.update({
      where: { id: data.rowId },
      data: {
        resultats: data.resultats || null,
        indicateurs: data.indicateurs || null,
        sources: data.sources || null,
        hypotheses: data.hypotheses || null,
      },
    });
  });

  revalidatePath(`/projets/${row.projectId}`);
  return row;
}

export async function deleteLogframeRow(input: DeleteLogframeRowInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteLogframeRowSchema.parse(input);

  const row = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.logframeRow.findUniqueOrThrow({ where: { id: data.rowId } });
    if (existing.theoryOfChangeNodeId) {
      throw new Error("Cette ligne est synchronisée avec la théorie du changement — supprimez le noeud ToC correspondant.");
    }
    return tx.logframeRow.delete({ where: { id: data.rowId } });
  });

  revalidatePath(`/projets/${row.projectId}`);
  return row;
}
