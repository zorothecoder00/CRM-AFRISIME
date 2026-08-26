"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import {
  createDataFormSchema,
  updateDataFormActifSchema,
  deleteDataFormSchema,
  addDataFormFieldSchema,
  deleteDataFormFieldSchema,
  submitDataFormSchema,
  deleteDataFormSubmissionSchema,
  type CreateDataFormInput,
  type UpdateDataFormActifInput,
  type DeleteDataFormInput,
  type AddDataFormFieldInput,
  type DeleteDataFormFieldInput,
  type SubmitDataFormInput,
  type DeleteDataFormSubmissionInput,
} from "@/lib/validations/data-form.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/**
 * Project Studio §48 — "collecte -> base de donnees -> indicateurs" : recalcule
 * la valeur actuelle de l'indicateur lie a un champ NOMBRE comme la somme de
 * toutes les soumissions de ce champ (collecte cumulative, ex. "nombre de
 * beneficiaires servis"). Appelee apres chaque creation/suppression de
 * soumission, dans la meme transaction.
 */
async function recomputeIndicatorFromField(tx: Prisma.TransactionClient, fieldId: string) {
  const field = await tx.projectDataFormField.findUnique({ where: { id: fieldId } });
  if (!field || !field.indicatorId || field.type !== "NOMBRE") return;

  const submissions = await tx.projectDataFormSubmission.findMany({ where: { formId: field.formId } });
  let sum = 0;
  for (const s of submissions) {
    const raw = (s.data as Record<string, string>)[fieldId];
    const n = raw !== undefined ? Number(raw) : NaN;
    if (!Number.isNaN(n)) sum += n;
  }
  await tx.indicator.update({ where: { id: field.indicatorId }, data: { valeurActuelle: sum } });
}

export async function createDataForm(input: CreateDataFormInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createDataFormSchema.parse(input);

  const form = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDataForm.create({
      data: {
        projectId: data.projectId,
        nom: data.nom,
        description: data.description,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "data_form.created",
    entityType: "ProjectDataForm",
    entityId: form.id,
    changes: { nom: form.nom, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return form;
}

export async function updateDataFormActif(input: UpdateDataFormActifInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateDataFormActifSchema.parse(input);

  const form = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDataForm.update({ where: { id: data.formId }, data: { actif: data.actif } })
  );

  await logAudit({
    userId: session.user.id,
    action: "data_form.actif_updated",
    entityType: "ProjectDataForm",
    entityId: form.id,
    changes: { actif: data.actif },
  });

  revalidatePath(`/projets/${form.projectId}`);
  return form;
}

export async function deleteDataForm(input: DeleteDataFormInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteDataFormSchema.parse(input);

  const form = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDataForm.delete({ where: { id: data.formId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "data_form.deleted",
    entityType: "ProjectDataForm",
    entityId: form.id,
    changes: { nom: form.nom },
  });

  revalidatePath(`/projets/${form.projectId}`);
  return form;
}

export async function addDataFormField(input: AddDataFormFieldInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = addDataFormFieldSchema.parse(input);

  const { field, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const form = await tx.projectDataForm.findUniqueOrThrow({ where: { id: data.formId }, select: { projectId: true } });
    const count = await tx.projectDataFormField.count({ where: { formId: data.formId } });
    const created = await tx.projectDataFormField.create({
      data: {
        formId: data.formId,
        label: data.label,
        type: data.type,
        options: data.type === "CHOIX_UNIQUE" ? data.options : undefined,
        requis: data.requis,
        ordre: count,
        indicatorId: data.type === "NOMBRE" ? data.indicatorId || undefined : undefined,
        organizationId: session.user.organizationId,
      },
    });
    return { field: created, projectId: form.projectId };
  });

  await logAudit({
    userId: session.user.id,
    action: "data_form.field_added",
    entityType: "ProjectDataFormField",
    entityId: field.id,
    changes: { label: field.label, type: field.type },
  });

  revalidatePath(`/projets/${projectId}`);
  return field;
}

export async function deleteDataFormField(input: DeleteDataFormFieldInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteDataFormFieldSchema.parse(input);

  const { field, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.projectDataFormField.findUniqueOrThrow({
      where: { id: data.fieldId },
      include: { form: { select: { projectId: true } } },
    });
    const deleted = await tx.projectDataFormField.delete({ where: { id: data.fieldId } });
    return { field: deleted, projectId: existing.form.projectId };
  });

  await logAudit({
    userId: session.user.id,
    action: "data_form.field_deleted",
    entityType: "ProjectDataFormField",
    entityId: field.id,
    changes: { label: field.label },
  });

  revalidatePath(`/projets/${projectId}`);
  return field;
}

export async function submitDataForm(input: SubmitDataFormInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = submitDataFormSchema.parse(input);

  const { submission, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const form = await tx.projectDataForm.findUniqueOrThrow({ where: { id: data.formId }, select: { projectId: true } });

    const created = await tx.projectDataFormSubmission.create({
      data: {
        formId: data.formId,
        data: data.data,
        submittedById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    const numericLinkedFields = await tx.projectDataFormField.findMany({
      where: { formId: data.formId, type: "NOMBRE", indicatorId: { not: null } },
    });
    for (const field of numericLinkedFields) {
      await recomputeIndicatorFromField(tx, field.id);
    }

    return { submission: created, projectId: form.projectId };
  });

  await logAudit({
    userId: session.user.id,
    action: "data_form.submitted",
    entityType: "ProjectDataFormSubmission",
    entityId: submission.id,
    changes: { formId: data.formId },
  });

  revalidatePath(`/projets/${projectId}`);
  return submission;
}

export async function deleteDataFormSubmission(input: DeleteDataFormSubmissionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteDataFormSubmissionSchema.parse(input);

  const { submission, projectId } = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.projectDataFormSubmission.findUniqueOrThrow({
      where: { id: data.submissionId },
      include: { form: { select: { projectId: true } } },
    });
    const deleted = await tx.projectDataFormSubmission.delete({ where: { id: data.submissionId } });

    const numericLinkedFields = await tx.projectDataFormField.findMany({
      where: { formId: existing.formId, type: "NOMBRE", indicatorId: { not: null } },
    });
    for (const field of numericLinkedFields) {
      await recomputeIndicatorFromField(tx, field.id);
    }

    return { submission: deleted, projectId: existing.form.projectId };
  });

  await logAudit({
    userId: session.user.id,
    action: "data_form.submission_deleted",
    entityType: "ProjectDataFormSubmission",
    entityId: submission.id,
    changes: {},
  });

  revalidatePath(`/projets/${projectId}`);
  return submission;
}
