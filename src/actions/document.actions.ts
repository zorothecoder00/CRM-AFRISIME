"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createFolderSchema,
  createDocumentSchema,
  addDocumentVersionSchema,
  updateDocumentSignatureSchema,
  type CreateFolderInput,
  type CreateDocumentInput,
  type AddDocumentVersionInput,
  type UpdateDocumentSignatureInput,
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

  await logAudit({
    userId: session.user.id,
    action: "document_folder.created",
    entityType: "DocumentFolder",
    entityId: folder.id,
    changes: { nom: folder.nom, projectId: data.projectId },
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
      sectionId: data.sectionId || undefined,
      taskId: data.taskId || undefined,
      meetingId: data.meetingId || undefined,
      nom: data.nom,
      description: data.description,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      type: data.type,
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

  await logAudit({
    userId: session.user.id,
    action: "document.created",
    entityType: "Document",
    entityId: document.id,
    changes: { nom: document.nom, projectId: data.projectId },
  });

  revalidatePath("/documents");
  revalidatePath(`/projets/${data.projectId}`);
  if (data.sectionId) revalidatePath(`/projets/${data.projectId}/sections/${data.sectionId}`);
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

  await logAudit({
    userId: session.user.id,
    action: "document.version_added",
    entityType: "Document",
    entityId: data.documentId,
    changes: { note: data.note },
  });

  revalidatePath(`/documents/${data.documentId}`);
  revalidatePath("/documents");
  if (document.taskId) revalidatePath(`/taches/${document.taskId}`);
  if (document.meetingId) revalidatePath(`/reunions/${document.meetingId}`);
  return version;
}

/**
 * Verifie l'acces a un document (cahier des charges §10). Sans ligne
 * DocumentAccess pour ce document, tout titulaire de document.read y a
 * acces (comportement historique). Des qu'une ligne existe, seuls
 * l'uploader et les utilisateurs listes peuvent le consulter.
 */
export async function canAccessDocument(documentId: string, userId: string): Promise<boolean> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { uploadedById: true, accessGrants: { select: { userId: true } } },
  });
  if (!document) return false;
  if (document.accessGrants.length === 0) return true;
  return document.uploadedById === userId || document.accessGrants.some((g) => g.userId === userId);
}

export async function grantDocumentAccess(documentId: string, userId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  await prisma.documentAccess.upsert({
    where: { documentId_userId: { documentId, userId } },
    update: {},
    create: { documentId, userId },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.access_granted",
    entityType: "Document",
    entityId: documentId,
    changes: { grantedTo: userId },
  });

  revalidatePath(`/documents/${documentId}`);
}

export async function revokeDocumentAccess(documentId: string, userId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  await prisma.documentAccess.deleteMany({ where: { documentId, userId } });

  await logAudit({
    userId: session.user.id,
    action: "document.access_revoked",
    entityType: "Document",
    entityId: documentId,
    changes: { revokedFrom: userId },
  });

  revalidatePath(`/documents/${documentId}`);
}

/** Suivi de signature (cahier des charges §16), typiquement pour un document de type CONTRAT. */
export async function updateDocumentSignature(input: UpdateDocumentSignatureInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const data = updateDocumentSignatureSchema.parse(input);

  const document = await prisma.document.update({
    where: { id: data.documentId },
    data: {
      statutSignature: data.statutSignature,
      dateSignature:
        data.statutSignature === "SIGNE"
          ? new Date(data.dateSignature || Date.now())
          : data.statutSignature === "EN_ATTENTE" || data.statutSignature === "NON_REQUISE"
            ? null
            : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.signature_updated",
    entityType: "Document",
    entityId: data.documentId,
    changes: { statutSignature: data.statutSignature },
  });

  revalidatePath(`/documents/${data.documentId}`);
  revalidatePath("/documents");
  return document;
}

/** Archivage (cahier des charges §17) : masque le document des listes par defaut sans le supprimer. */
export async function archiveDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const document = await prisma.document.update({
    where: { id: documentId },
    data: { estArchive: true, dateArchivage: new Date(), archivedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.archived",
    entityType: "Document",
    entityId: documentId,
    changes: {},
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return document;
}

export async function unarchiveDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const document = await prisma.document.update({
    where: { id: documentId },
    data: { estArchive: false, dateArchivage: null, archivedById: null },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.unarchived",
    entityType: "Document",
    entityId: documentId,
    changes: {},
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  return document;
}
