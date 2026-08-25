"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createBudgetLineSchema,
  updateBudgetLineRealisationSchema,
  deleteBudgetLineSchema,
  type CreateBudgetLineInput,
  type UpdateBudgetLineRealisationInput,
  type DeleteBudgetLineInput,
} from "@/lib/validations/budget-line.schema";

/** Budget Builder / Budget par activité (Project Studio §22-23) — prévu/engagé/payé par ligne. */
export async function createBudgetLine(input: CreateBudgetLineInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createBudgetLineSchema.parse(input);

  const line = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.budgetLine.create({
      data: {
        projectId: data.projectId,
        sectionId: data.sectionId,
        categorie: data.categorie,
        libelle: data.libelle,
        montantPrevu: data.montantPrevu,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "budget_line.created",
    entityType: "BudgetLine",
    entityId: line.id,
    changes: { categorie: line.categorie, libelle: line.libelle, montantPrevu: data.montantPrevu },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return line;
}

export async function updateBudgetLineRealisation(input: UpdateBudgetLineRealisationInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateBudgetLineRealisationSchema.parse(input);

  const line = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.budgetLine.update({
      where: { id: data.budgetLineId },
      data: {
        montantEngage: data.montantEngage,
        montantPaye: data.montantPaye,
      },
    })
  );

  revalidatePath(`/projets/${line.projectId}`);
  return line;
}

export async function deleteBudgetLine(input: DeleteBudgetLineInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteBudgetLineSchema.parse(input);

  const line = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.budgetLine.delete({ where: { id: data.budgetLineId } })
  );

  revalidatePath(`/projets/${line.projectId}`);
  return line;
}
