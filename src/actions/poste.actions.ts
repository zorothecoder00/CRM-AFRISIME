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
  addPosteResponsabiliteSchema,
  setPosteCritiqueSchema,
  type CreatePosteInput,
  type UpdatePosteInput,
  type DeletePosteInput,
  type AddPosteResponsabiliteInput,
  type SetPosteCritiqueInput,
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

export async function addPosteResponsabilite(input: AddPosteResponsabiliteInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = addPosteResponsabiliteSchema.parse(input);

  const count = await prisma.posteResponsabilite.count({ where: { posteId: data.posteId } });
  const responsabilite = await prisma.posteResponsabilite.create({
    data: { posteId: data.posteId, libelle: data.libelle, ordre: count },
  });

  await logAudit({
    userId: session.user.id,
    action: "poste.responsabilite_added",
    entityType: "Poste",
    entityId: data.posteId,
    changes: { libelle: data.libelle },
  });

  revalidatePath("/administration/postes");
  return responsabilite;
}

/** Poste critique (cahier des charges V3.0 §24) — alimente le plan de succession et le Workforce Planning (§22). */
export async function setPosteCritique(input: SetPosteCritiqueInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = setPosteCritiqueSchema.parse(input);

  const poste = await prisma.poste.update({ where: { id: data.id }, data: { critique: data.critique } });

  await logAudit({
    userId: session.user.id,
    action: "poste.critique_toggled",
    entityType: "Poste",
    entityId: poste.id,
    changes: { critique: poste.critique },
  });

  revalidatePath("/administration/postes");
  revalidatePath("/succession");
  revalidatePath("/planification-effectifs");
  return poste;
}

export async function deletePosteResponsabilite(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);

  const responsabilite = await prisma.posteResponsabilite.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "poste.responsabilite_removed",
    entityType: "Poste",
    entityId: responsabilite.posteId,
    changes: { libelle: responsabilite.libelle },
  });

  revalidatePath("/administration/postes");
}
