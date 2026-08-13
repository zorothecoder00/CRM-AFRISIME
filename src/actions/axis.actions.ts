"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createAxisSchema,
  updateAxisSchema,
  deleteAxisSchema,
  type CreateAxisInput,
  type UpdateAxisInput,
  type DeleteAxisInput,
} from "@/lib/validations/axis.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Axe strategique (cahier des charges §III) — meme permission que la planification, dont il est le pendant strategique. */
export async function createAxis(input: CreateAxisInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = createAxisSchema.parse(input);

  const axis = await prisma.strategicAxis.create({
    data: {
      nom: data.nom,
      description: data.description,
      priorite: data.priorite,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "axis.created",
    entityType: "StrategicAxis",
    entityId: axis.id,
    changes: { nom: axis.nom },
  });

  revalidatePath("/strategie");
  return axis;
}

export async function updateAxis(input: UpdateAxisInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = updateAxisSchema.parse(input);

  const axis = await prisma.strategicAxis.update({
    where: { id: data.id },
    data: { nom: data.nom, description: data.description, priorite: data.priorite },
  });

  await logAudit({
    userId: session.user.id,
    action: "axis.updated",
    entityType: "StrategicAxis",
    entityId: axis.id,
    changes: { nom: axis.nom },
  });

  revalidatePath("/strategie");
  return axis;
}

export async function deleteAxis(input: DeleteAxisInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PLAN_MANAGE);
  const data = deleteAxisSchema.parse(input);

  const axis = await prisma.strategicAxis.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "axis.deleted",
    entityType: "StrategicAxis",
    entityId: axis.id,
    changes: { nom: axis.nom },
  });

  revalidatePath("/strategie");
  return axis;
}
