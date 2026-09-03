"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createObjectiveSchema,
  updateObjectiveSchema,
  updateObjectiveStatusSchema,
  addIndicatorSchema,
  updateIndicatorValueSchema,
  updateIndicatorDetailsSchema,
  linkObjectiveParentSchema,
  updateObjectiveSmartSchema,
  type CreateObjectiveInput,
  type UpdateObjectiveInput,
  type AddIndicatorInput,
  type UpdateIndicatorValueInput,
  type UpdateIndicatorDetailsInput,
  type LinkObjectiveParentInput,
  type UpdateObjectiveSmartInput,
} from "@/lib/validations/objective.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Meme principe que assertNoCycle pour Department/Plan/KnowledgeCategory. */
async function assertNoCycle(objectiveId: string, parentId: string) {
  if (parentId === objectiveId) {
    throw new Error("Un objectif ne peut pas être son propre objectif parent.");
  }
  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === objectiveId) {
      throw new Error("Ce rattachement créerait une boucle dans la cascade d'objectifs.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.objective.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createObjective(input: CreateObjectiveInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_CREATE);

  const data = createObjectiveSchema.parse(input);

  const objective = await prisma.objective.create({
    data: {
      titre: data.titre,
      description: data.description,
      periode: data.periode,
      scope: data.scope,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      userId: data.scope === "INDIVIDUEL" ? data.userId : undefined,
      projectId: data.scope === "EQUIPE" ? data.projectId : undefined,
      departmentId: data.scope === "DEPARTEMENT" ? data.departmentId : undefined,
      programmeId: data.scope === "PROGRAMME" ? data.programmeId : undefined,
      axisId: data.axisId || undefined,
      parentId: data.parentId || undefined,
      niveau: data.niveau || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "objective.created",
    entityType: "Objective",
    entityId: objective.id,
    changes: { titre: objective.titre, periode: data.periode, scope: data.scope },
  });

  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
  if (data.scope === "PROGRAMME" && data.programmeId) revalidatePath(`/programmes/${data.programmeId}`);
  return objective;
}

/** Modification/réévaluation du contenu et du calendrier d'un objectif existant (demande utilisateur — seul le statut était modifiable jusqu'ici). */
export async function updateObjective(input: UpdateObjectiveInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = updateObjectiveSchema.parse(input);

  const objective = await prisma.objective.update({
    where: { id: data.objectiveId },
    data: {
      titre: data.titre,
      description: data.description,
      periode: data.periode,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "objective.updated",
    entityType: "Objective",
    entityId: objective.id,
    changes: { titre: data.titre, periode: data.periode, dateDebut: data.dateDebut, dateFin: data.dateFin },
  });

  revalidatePath(`/objectifs/${data.objectiveId}`);
  revalidatePath("/objectifs");
  return objective;
}

export async function updateObjectiveStatus(objectiveId: string, statut: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = updateObjectiveStatusSchema.parse({ objectiveId, statut });

  const objective = await prisma.objective.update({
    where: { id: data.objectiveId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "objective.status_updated",
    entityType: "Objective",
    entityId: objective.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/objectifs/${objectiveId}`);
  revalidatePath("/objectifs");
  return objective;
}

export async function addIndicator(input: AddIndicatorInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = addIndicatorSchema.parse(input);

  const indicator = await prisma.indicator.create({
    data: {
      objectiveId: data.objectiveId,
      nom: data.nom,
      unite: data.unite,
      valeurCible: Number(data.valeurCible),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "indicator.created",
    entityType: "Objective",
    entityId: data.objectiveId,
    changes: { nom: indicator.nom },
  });

  revalidatePath(`/objectifs/${data.objectiveId}`);
  return { ...indicator, valeurCible: Number(indicator.valeurCible), valeurActuelle: Number(indicator.valeurActuelle) };
}

export async function updateIndicatorValue(input: UpdateIndicatorValueInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = updateIndicatorValueSchema.parse(input);

  const indicator = await prisma.indicator.update({
    where: { id: data.indicatorId },
    data: { valeurActuelle: Number(data.valeurActuelle) },
  });

  await logAudit({
    userId: session.user.id,
    action: "indicator.value_updated",
    entityType: "Objective",
    entityId: indicator.objectiveId ?? indicator.id,
    changes: { indicatorId: indicator.id, valeurActuelle: data.valeurActuelle },
  });

  if (indicator.objectiveId) revalidatePath(`/objectifs/${indicator.objectiveId}`);
  if (indicator.projectId) revalidatePath(`/projets/${indicator.projectId}`);
  if (indicator.taskId) revalidatePath(`/taches/${indicator.taskId}`);
  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
  return { ...indicator, valeurCible: Number(indicator.valeurCible), valeurActuelle: Number(indicator.valeurActuelle) };
}

/** Project Studio §49 (Indicator Management) — edition des champs de gestion (definition/formule/baseline/source/frequence/responsable/desagregation), communs quel que soit le parent (Objectif/Projet/Tache). */
export async function updateIndicatorDetails(input: UpdateIndicatorDetailsInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = updateIndicatorDetailsSchema.parse(input);

  const indicator = await prisma.indicator.update({
    where: { id: data.indicatorId },
    data: {
      nom: data.nom,
      unite: data.unite,
      valeurCible: Number(data.valeurCible),
      definition: data.definition,
      formule: data.formule,
      baseline: data.baseline ? Number(data.baseline) : null,
      source: data.source,
      frequence: data.frequence,
      responsableId: data.responsableId || null,
      desagregation: data.desagregation,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "indicator.details_updated",
    entityType: "Indicator",
    entityId: indicator.id,
    changes: { nom: indicator.nom },
  });

  if (indicator.objectiveId) revalidatePath(`/objectifs/${indicator.objectiveId}`);
  if (indicator.projectId) revalidatePath(`/projets/${indicator.projectId}`);
  if (indicator.taskId) revalidatePath(`/taches/${indicator.taskId}`);
  return {
    ...indicator,
    valeurCible: Number(indicator.valeurCible),
    valeurActuelle: Number(indicator.valeurActuelle),
    baseline: indicator.baseline !== null ? Number(indicator.baseline) : null,
  };
}

/** Rattache (ou detache si parentId absent) un objectif a son objectif parent (cahier des charges §III). */
export async function linkObjectiveParent(input: LinkObjectiveParentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);
  const data = linkObjectiveParentSchema.parse(input);

  if (data.parentId) {
    await assertNoCycle(data.objectiveId, data.parentId);
  }

  const objective = await prisma.objective.update({
    where: { id: data.objectiveId },
    data: { parentId: data.parentId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: data.parentId ? "objective.parent_linked" : "objective.parent_unlinked",
    entityType: "Objective",
    entityId: objective.id,
    changes: { parentId: data.parentId ?? null },
  });

  revalidatePath(`/objectifs/${data.objectiveId}`);
  revalidatePath("/objectifs");
  return objective;
}

/** Évaluation SMART (Project Studio §14) — un booléen par critère, voir computeSmartScore. */
export async function updateObjectiveSmart(input: UpdateObjectiveSmartInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);
  const data = updateObjectiveSmartSchema.parse(input);

  const objective = await prisma.objective.update({
    where: { id: data.objectiveId },
    data: {
      smartSpecifique: data.smartSpecifique,
      smartMesurable: data.smartMesurable,
      smartAtteignable: data.smartAtteignable,
      smartPertinent: data.smartPertinent,
      smartTemporel: data.smartTemporel,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "objective.smart_updated",
    entityType: "Objective",
    entityId: objective.id,
    changes: { ...data },
  });

  revalidatePath(`/objectifs/${data.objectiveId}`);
  revalidatePath("/objectifs");
  if (objective.projectId) revalidatePath(`/projets/${objective.projectId}`);
  return objective;
}
