"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import {
  createProjectChangeRequestSchema,
  decideProjectChangeRequestSchema,
  type CreateProjectChangeRequestInput,
  type DecideProjectChangeRequestInput,
} from "@/lib/validations/project-change-request.schema";

/** Change Request Management (Project Studio §31). */
export async function createProjectChangeRequest(input: CreateProjectChangeRequestInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = createProjectChangeRequestSchema.parse(input);

  const changeRequest = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectChangeRequest.create({
      data: {
        projectId: data.projectId,
        titre: data.titre,
        description: data.description,
        budgetPropose: data.budgetPropose ? Number(data.budgetPropose) : undefined,
        dateFinProposee: data.dateFinProposee ? new Date(data.dateFinProposee) : undefined,
        impactRessources: data.impactRessources,
        impactRisques: data.impactRisques,
        impactResultats: data.impactResultats,
        demandeParId: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_change_request.created",
    entityType: "ProjectChangeRequest",
    entityId: changeRequest.id,
    changes: { titre: changeRequest.titre, projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return { ...changeRequest, budgetPropose: changeRequest.budgetPropose ? Number(changeRequest.budgetPropose) : null };
}

/**
 * Approuver/Rejeter/Demander modification (§31). L'approbation N'APPLIQUE
 * PAS automatiquement le budget/la date proposes au projet — une decision
 * de gouvernance ne doit pas modifier silencieusement des donnees projet
 * sans un geste explicite separe (voir memoire "actions sensibles").
 */
export async function decideProjectChangeRequest(input: DecideProjectChangeRequestInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = decideProjectChangeRequestSchema.parse(input);

  const changeRequest = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectChangeRequest.update({
      where: { id: data.changeRequestId },
      data: {
        statut: data.decision,
        commentaireDecision: data.commentaireDecision,
        decidedById: session.user.id,
        decidedAt: new Date(),
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_change_request.decided",
    entityType: "ProjectChangeRequest",
    entityId: changeRequest.id,
    changes: { decision: data.decision },
  });

  if (changeRequest.demandeParId !== session.user.id) {
    const DECISION_LABELS: Record<string, string> = {
      APPROUVE: "approuvée",
      REJETE: "rejetée",
      MODIFICATION_DEMANDEE: "renvoyée pour modification",
    };
    await createNotification({
      userId: changeRequest.demandeParId,
      type: "VALIDATION",
      titre: `Demande de modification ${DECISION_LABELS[data.decision]} : ${changeRequest.titre}`,
      lien: `/projets/${changeRequest.projectId}`,
      entityType: "ProjectChangeRequest",
      entityId: changeRequest.id,
    });
  }

  revalidatePath(`/projets/${changeRequest.projectId}`);
  return { ...changeRequest, budgetPropose: changeRequest.budgetPropose ? Number(changeRequest.budgetPropose) : null };
}
