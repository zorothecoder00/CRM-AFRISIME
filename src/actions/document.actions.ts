"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import {
  createFolderSchema,
  createDocumentSchema,
  addDocumentVersionSchema,
  type CreateFolderInput,
  type CreateDocumentInput,
  type AddDocumentVersionInput,
} from "@/lib/validations/document.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createFolder(input: CreateFolderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);

  const data = createFolderSchema.parse(input);

  const folder = await prisma.documentFolder.create({
    data: {
      projectId: data.projectId,
      parentId: data.parentId || undefined,
      nom: data.nom,
      createdById: session.user.id,
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/projets/${data.projectId}`);
  return folder;
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_CREATE);

  const data = createDocumentSchema.parse(input);

  const document = await prisma.document.create({
    data: {
      projectId: data.projectId,
      folderId: data.folderId || undefined,
      taskId: data.taskId || undefined,
      meetingId: data.meetingId || undefined,
      nom: data.nom,
      description: data.description,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedById: session.user.id,
      versions: {
        create: [
          {
            url: data.url,
            mimeType: data.mimeType,
            sizeBytes: data.sizeBytes,
            createdById: session.user.id,
          },
        ],
      },
    },
  });

  revalidatePath("/documents");
  revalidatePath(`/projets/${data.projectId}`);
  if (data.taskId) revalidatePath(`/taches/${data.taskId}`);
  if (data.meetingId) revalidatePath(`/reunions/${data.meetingId}`);
  return document;
}

export async function addDocumentVersion(input: AddDocumentVersionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const data = addDocumentVersionSchema.parse(input);

  const version = await prisma.documentVersion.create({
    data: {
      documentId: data.documentId,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      note: data.note,
      createdById: session.user.id,
    },
  });

  const document = await prisma.document.update({
    where: { id: data.documentId },
    data: { url: data.url, mimeType: data.mimeType, sizeBytes: data.sizeBytes },
  });

  revalidatePath(`/documents/${data.documentId}`);
  revalidatePath("/documents");
  if (document.taskId) revalidatePath(`/taches/${document.taskId}`);
  if (document.meetingId) revalidatePath(`/reunions/${document.meetingId}`);
  return version;
}
