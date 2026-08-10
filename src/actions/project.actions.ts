"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createProjectSchema,
  createSectionSchema,
  type CreateProjectInput,
  type CreateSectionInput,
} from "@/lib/validations/project.schema";

export async function createProject(input: CreateProjectInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = createProjectSchema.parse(input);

  const project = await prisma.project.create({
    data: {
      nom: data.nom,
      description: data.description,
      objectif: data.objectif,
      responsableId: data.responsableId,
      departmentId: data.departmentId,
      priorite: data.priorite,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      budget: data.budget ? Number(data.budget) : undefined,
      createdById: session.user.id,
      members: {
        create: [{ userId: data.responsableId, roleOnProject: "CHEF_PROJET" }],
      },
    },
  });

  revalidatePath("/projets");
  return project;
}

export async function createSection(input: CreateSectionInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.SECTION_CREATE);

  const data = createSectionSchema.parse(input);

  const section = await prisma.projectSection.create({
    data: {
      projectId: data.projectId,
      parentId: data.parentId || undefined,
      type: data.type,
      nom: data.nom,
      responsableId: data.responsableId || undefined,
    },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return section;
}
