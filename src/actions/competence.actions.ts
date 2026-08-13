"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createCompetenceSchema,
  assignCompetenceSchema,
  type CreateCompetenceInput,
  type AssignCompetenceInput,
} from "@/lib/validations/competence.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Catalogue de compétences (cahier des charges §XII) — géré en administration. */
export async function createCompetence(input: CreateCompetenceInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createCompetenceSchema.parse(input);

  const competence = await prisma.competence.create({
    data: { nom: data.nom, categorie: data.categorie || undefined, createdById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "competence.created",
    entityType: "Competence",
    entityId: competence.id,
    changes: { nom: competence.nom },
  });

  revalidatePath("/administration/competences");
  return competence;
}

export async function deleteCompetence(id: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);

  const competence = await prisma.competence.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "competence.deleted",
    entityType: "Competence",
    entityId: competence.id,
    changes: { nom: competence.nom },
  });

  revalidatePath("/administration/competences");
}

/** Auto-déclaratif : chaque collaborateur gère ses propres compétences (comme un CV). */
export async function assignCompetence(input: AssignCompetenceInput) {
  const session = await requireSession();
  const data = assignCompetenceSchema.parse(input);

  const userCompetence = await prisma.userCompetence.upsert({
    where: { userId_competenceId: { userId: session.user.id, competenceId: data.competenceId } },
    update: { niveau: data.niveau, notes: data.notes || undefined },
    create: {
      userId: session.user.id,
      competenceId: data.competenceId,
      niveau: data.niveau,
      notes: data.notes || undefined,
    },
  });

  revalidatePath("/parametres/profil");
  revalidatePath(`/pilotage/utilisateur/${session.user.id}`);
  return userCompetence;
}

export async function removeCompetence(competenceId: string) {
  const session = await requireSession();

  await prisma.userCompetence.deleteMany({ where: { userId: session.user.id, competenceId } });

  revalidatePath("/parametres/profil");
  revalidatePath(`/pilotage/utilisateur/${session.user.id}`);
}
