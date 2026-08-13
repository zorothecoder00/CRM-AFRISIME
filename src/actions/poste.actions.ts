"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createPosteSchema,
  updatePosteSchema,
  deletePosteSchema,
  type CreatePosteInput,
  type UpdatePosteInput,
  type DeletePosteInput,
} from "@/lib/validations/poste.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createPoste(input: CreatePosteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createPosteSchema.parse(input);

  const poste = await prisma.poste.create({
    data: {
      nom: data.nom,
      description: data.description,
      responsabilites: data.responsabilites,
      departmentId: data.departmentId || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "poste.created",
    entityType: "Poste",
    entityId: poste.id,
    changes: { nom: poste.nom },
  });

  revalidatePath("/administration/postes");
  return poste;
}

export async function updatePoste(input: UpdatePosteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = updatePosteSchema.parse(input);

  const poste = await prisma.poste.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      description: data.description,
      responsabilites: data.responsabilites,
      departmentId: data.departmentId || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "poste.updated",
    entityType: "Poste",
    entityId: poste.id,
    changes: { nom: poste.nom },
  });

  revalidatePath("/administration/postes");
  return poste;
}

export async function deletePoste(input: DeletePosteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = deletePosteSchema.parse(input);

  const poste = await prisma.poste.delete({ where: { id: data.id } });

  await logAudit({
    userId: session.user.id,
    action: "poste.deleted",
    entityType: "Poste",
    entityId: poste.id,
    changes: { nom: poste.nom },
  });

  revalidatePath("/administration/postes");
  return poste;
}
