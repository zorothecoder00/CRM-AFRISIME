"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createComplianceObligationSchema,
  updateComplianceObligationStatutSchema,
  addComplianceControlSchema,
  type CreateComplianceObligationInput,
  type UpdateComplianceObligationStatutInput,
  type AddComplianceControlInput,
} from "@/lib/validations/compliance.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Conformité (cahier des charges V3.0 §44, "Security & Trust Center") — comble un trou : le modèle ComplianceObligation (v2.0 §6) n'avait aucune page. */
export async function createComplianceObligation(input: CreateComplianceObligationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);
  const data = createComplianceObligationSchema.parse(input);

  const obligation = await prisma.complianceObligation.create({
    data: {
      code: data.code || undefined,
      titre: data.titre,
      description: data.description || undefined,
      type: data.type,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      responsableId: data.responsableId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "compliance_obligation.created",
    entityType: "ComplianceObligation",
    entityId: obligation.id,
    changes: { titre: obligation.titre },
  });

  revalidatePath("/conformite");
  return { id: obligation.id };
}

export async function updateComplianceObligationStatut(input: UpdateComplianceObligationStatutInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);
  const data = updateComplianceObligationStatutSchema.parse(input);

  const obligation = await prisma.complianceObligation.update({
    where: { id: data.id },
    data: { statut: data.statut },
  });

  revalidatePath("/conformite");
  return { id: obligation.id };
}

export async function addComplianceControl(input: AddComplianceControlInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);
  const data = addComplianceControlSchema.parse(input);

  const control = await prisma.complianceControl.create({
    data: {
      obligationId: data.obligationId,
      resultat: data.resultat,
      commentaire: data.commentaire || undefined,
      controleParId: session.user.id,
    },
  });

  await prisma.complianceObligation.update({
    where: { id: data.obligationId },
    data: { statut: data.resultat === "CONFORME" ? "A_JOUR" : "NON_CONFORME" },
  });

  await logAudit({
    userId: session.user.id,
    action: "compliance_control.added",
    entityType: "ComplianceObligation",
    entityId: data.obligationId,
    changes: { resultat: control.resultat },
  });

  revalidatePath("/conformite");
  return control;
}
