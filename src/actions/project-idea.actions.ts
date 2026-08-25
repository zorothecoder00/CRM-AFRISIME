"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createProjectIdeaSchema,
  updateProjectIdeaSchema,
  updateProjectIdeaStatusSchema,
  deleteProjectIdeaSchema,
  convertProjectIdeaSchema,
  type CreateProjectIdeaInput,
  type UpdateProjectIdeaInput,
  type UpdateProjectIdeaStatusInput,
  type DeleteProjectIdeaInput,
  type ConvertProjectIdeaInput,
} from "@/lib/validations/project-idea.schema";

export async function createProjectIdea(input: CreateProjectIdeaInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = createProjectIdeaSchema.parse(input);

  const idea = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectIdea.create({
      data: {
        titreProvisoire: data.titreProvisoire,
        origine: data.origine,
        probleme: data.probleme,
        opportunite: data.opportunite,
        beneficiaires: data.beneficiaires,
        zone: data.zone,
        porteurId: data.porteurId || undefined,
        departmentId: data.departmentId || undefined,
        estimationBudgetaire: data.estimationBudgetaire ? Number(data.estimationBudgetaire) : undefined,
        dureeEstimee: data.dureeEstimee,
        priorite: data.priorite,
        sourceFinancementPotentielle: data.sourceFinancementPotentielle,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_idea.created",
    entityType: "ProjectIdea",
    entityId: idea.id,
    changes: { titreProvisoire: idea.titreProvisoire },
  });

  revalidatePath("/projets/idees");
  return { ...idea, estimationBudgetaire: idea.estimationBudgetaire ? Number(idea.estimationBudgetaire) : null };
}

export async function updateProjectIdea(input: UpdateProjectIdeaInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectIdeaSchema.parse(input);

  const idea = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectIdea.update({
      where: { id: data.ideaId },
      data: {
        titreProvisoire: data.titreProvisoire,
        origine: data.origine,
        probleme: data.probleme,
        opportunite: data.opportunite,
        beneficiaires: data.beneficiaires,
        zone: data.zone,
        porteurId: data.porteurId || null,
        departmentId: data.departmentId || null,
        estimationBudgetaire: data.estimationBudgetaire ? Number(data.estimationBudgetaire) : null,
        dureeEstimee: data.dureeEstimee,
        priorite: data.priorite,
        sourceFinancementPotentielle: data.sourceFinancementPotentielle,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_idea.updated",
    entityType: "ProjectIdea",
    entityId: idea.id,
    changes: { titreProvisoire: idea.titreProvisoire },
  });

  revalidatePath("/projets/idees");
  revalidatePath(`/projets/idees/${idea.id}`);
  return { ...idea, estimationBudgetaire: idea.estimationBudgetaire ? Number(idea.estimationBudgetaire) : null };
}

export async function updateProjectIdeaStatus(input: UpdateProjectIdeaStatusInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectIdeaStatusSchema.parse(input);

  if (data.statut === "PROJET_CREE") {
    throw new Error("Utilisez la conversion en projet pour marquer une idée « Projet créé ».");
  }

  const idea = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectIdea.update({
      where: { id: data.ideaId },
      data: { statut: data.statut, motifRejet: data.statut === "REJETEE" ? data.motifRejet : null },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_idea.status_updated",
    entityType: "ProjectIdea",
    entityId: idea.id,
    changes: { statut: data.statut },
  });

  revalidatePath("/projets/idees");
  revalidatePath(`/projets/idees/${idea.id}`);
  return { ...idea, estimationBudgetaire: idea.estimationBudgetaire ? Number(idea.estimationBudgetaire) : null };
}

export async function deleteProjectIdea(input: DeleteProjectIdeaInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = deleteProjectIdeaSchema.parse(input);

  const idea = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectIdea.delete({ where: { id: data.ideaId } })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_idea.deleted",
    entityType: "ProjectIdea",
    entityId: idea.id,
    changes: { titreProvisoire: idea.titreProvisoire },
  });

  revalidatePath("/projets/idees");
  return { ...idea, estimationBudgetaire: idea.estimationBudgetaire ? Number(idea.estimationBudgetaire) : null };
}

/**
 * Conversion Idée → Project (Project Studio §4/§5) — n'est autorisée que
 * depuis le statut EN_CONCEPTION (dernière étape avant "Projet créé" dans le
 * workflow du cahier des charges). Crée le Project à partir de l'idée et de
 * sa Concept Note si elle existe, crée un Financement "recherché" si la note
 * en indique un montant, puis marque l'idée PROJET_CREE avec le lien vers le
 * projet — le tout dans une seule transaction pour éviter un projet orphelin
 * si l'écriture finale sur l'idée échouait.
 */
export async function convertProjectIdeaToProject(input: ConvertProjectIdeaInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = convertProjectIdeaSchema.parse(input);

  const project = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const idea = await tx.projectIdea.findUniqueOrThrow({
      where: { id: data.ideaId },
      include: { conceptNote: true },
    });

    if (idea.convertedProjectId) {
      throw new Error("Cette idée a déjà été convertie en projet.");
    }
    if (idea.statut !== "EN_CONCEPTION") {
      throw new Error("L'idée doit être au statut « En conception » avant de générer le projet.");
    }

    const note = idea.conceptNote;
    const created = await tx.project.create({
      data: {
        nom: idea.titreProvisoire,
        description: note?.contexte ?? idea.probleme ?? undefined,
        objectif: note?.objectifs ?? idea.opportunite ?? undefined,
        responsableId: data.responsableId,
        departmentId: data.departmentId,
        priorite: idea.priorite,
        localisation: idea.zone ?? undefined,
        budget: note?.budgetIndicatif ?? idea.estimationBudgetaire ?? undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
        members: {
          create: [
            { userId: data.responsableId, roleOnProject: "CHEF_PROJET", organizationId: session.user.organizationId },
          ],
        },
      },
    });

    if (note?.financementRecherche) {
      await tx.financement.create({
        data: {
          projectId: created.id,
          bailleur: idea.sourceFinancementPotentielle || "À déterminer",
          montant: note.financementRecherche,
          statut: "RECHERCHE",
          createdById: session.user.id,
          organizationId: session.user.organizationId,
        },
      });
    }

    await tx.projectIdea.update({
      where: { id: idea.id },
      data: { statut: "PROJET_CREE", convertedProjectId: created.id },
    });

    return created;
  });

  await logAudit({
    userId: session.user.id,
    action: "project_idea.converted_to_project",
    entityType: "Project",
    entityId: project.id,
    changes: { ideaId: data.ideaId },
  });

  revalidatePath("/projets/idees");
  revalidatePath(`/projets/idees/${data.ideaId}`);
  revalidatePath("/projets");
  return { ...project, budget: project.budget ? Number(project.budget) : null, coutReel: project.coutReel ? Number(project.coutReel) : null };
}
