"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  upsertQualityPlanSchema,
  publishQualityPlanSchema,
  createQualityControlSchema,
  type UpsertQualityPlanInput,
  type PublishQualityPlanInput,
  type CreateQualityControlInput,
} from "@/lib/validations/quality.schema";

/**
 * Quality Management (Project Studio §33). Un seul Quality Plan par projet
 * (QualityDocument type=PLAN_QUALITE) : upsert plutot que create pour eviter
 * les doublons si l'utilisateur re-soumet le formulaire.
 */
export async function upsertQualityPlan(input: UpsertQualityPlanInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = upsertQualityPlanSchema.parse(input);

  const existing = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.qualityDocument.findFirst({ where: { projectId: data.projectId, type: "PLAN_QUALITE" } })
  );

  const doc = await withTenantScopedSession(session.user.organizationId, (tx) =>
    existing
      ? tx.qualityDocument.update({
          where: { id: existing.id },
          data: { titre: data.titre, contenu: data.contenu, version: { increment: 1 } },
        })
      : tx.qualityDocument.create({
          data: {
            type: "PLAN_QUALITE",
            projectId: data.projectId,
            titre: data.titre,
            contenu: data.contenu,
            responsableId: session.user.id,
            createdById: session.user.id,
            organizationId: session.user.organizationId,
          },
        })
  );

  await logAudit({
    userId: session.user.id,
    action: existing ? "quality_plan.updated" : "quality_plan.created",
    entityType: "QualityDocument",
    entityId: doc.id,
    changes: { projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return doc;
}

export async function publishQualityPlan(input: PublishQualityPlanInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = publishQualityPlanSchema.parse(input);

  const doc = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.qualityDocument.update({ where: { id: data.documentId }, data: { statut: "PUBLIE" } })
  );

  if (doc.projectId) revalidatePath(`/projets/${doc.projectId}`);
  return doc;
}

export async function createQualityControl(input: CreateQualityControlInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createQualityControlSchema.parse(input);

  const control = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.qualityControl.create({
      data: {
        projectId: data.projectId,
        deliverableId: data.deliverableId,
        titre: data.titre,
        resultat: data.resultat,
        commentaire: data.commentaire,
        nonConformite: data.resultat === "NON_CONFORME" ? data.nonConformite : undefined,
        actionCorrective: data.actionCorrective,
        responsableId: data.responsableId,
        controleParId: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "quality_control.created",
    entityType: "QualityControl",
    entityId: control.id,
    changes: { titre: control.titre, resultat: control.resultat, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return control;
}
