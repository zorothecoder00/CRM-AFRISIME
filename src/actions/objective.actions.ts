"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createObjectiveSchema,
  updateObjectiveStatusSchema,
  addIndicatorSchema,
  updateIndicatorValueSchema,
  type CreateObjectiveInput,
  type AddIndicatorInput,
  type UpdateIndicatorValueInput,
} from "@/lib/validations/objective.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
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
      createdById: session.user.id,
    },
  });

  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
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

  revalidatePath(`/objectifs/${data.objectiveId}`);
  return indicator;
}

export async function updateIndicatorValue(input: UpdateIndicatorValueInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.OBJECTIVE_UPDATE);

  const data = updateIndicatorValueSchema.parse(input);

  const indicator = await prisma.indicator.update({
    where: { id: data.indicatorId },
    data: { valeurActuelle: Number(data.valeurActuelle) },
  });

  revalidatePath(`/objectifs/${indicator.objectiveId}`);
  revalidatePath("/objectifs");
  revalidatePath("/dashboard");
  return indicator;
}
