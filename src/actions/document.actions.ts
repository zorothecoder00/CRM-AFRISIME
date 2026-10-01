"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createFolderSchema,
  updateFolderSchema,
  moveDocumentToFolderSchema,
  createFolderWithDocumentSchema,
  createDocumentSchema,
  addDocumentVersionSchema,
  setDocumentVersionValidationSchema,
  updateDocumentSignatureSchema,
  depositPortalDocumentSchema,
  reviewPortalDeliverableSchema,
  type CreateFolderInput,
  type UpdateFolderInput,
  type MoveDocumentToFolderInput,
  type CreateFolderWithDocumentInput,
  type CreateDocumentInput,
  type AddDocumentVersionInput,
  type SetDocumentVersionValidationInput,
  type UpdateDocumentSignatureInput,
  type DepositPortalDocumentInput,
  type ReviewPortalDeliverableInput,
} from "@/lib/validations/document.schema";
import { getPortalSession } from "@/lib/portal-auth";
import { createNotification, notifyMany } from "@/lib/notify";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Revue de robustesse (2026-09-11) — convertit un `findUniqueOrThrow` manqué (P2025) en message clair plutôt que l'erreur Prisma brute. */
async function withNotFoundMessage<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new Error(message);
    }
    throw err;
  }
}

/**
 * Verifie qu'un dossier appartient bien au meme espace que l'element qu'on y
 * range : meme projet, ou les deux "libres" (projectId null). Sans ce
 * controle, un document libre pourrait atterrir dans un dossier de projet
 * (ou l'inverse) et n'apparaitrait plus nulle part dans /documents.
 */
async function assertFolderScope(folderId: string, projectId: string | null) {
  const folder = await prisma.documentFolder.findUnique({ where: { id: folderId }, select: { projectId: true } });
  if (!folder) throw new Error("Dossier introuvable.");
  if (folder.projectId !== projectId) {
    throw new Error(
      projectId
        ? "Ce dossier n'appartient pas au projet du document."
        : "Un document libre ne peut être rangé que dans un dossier de documents libres."
    );
  }
}

function revalidateFolderPaths(projectId: string | null) {
  revalidatePath("/documents");
  if (projectId) revalidatePath(`/projets/${projectId}`);
}

export async function createFolder(input: CreateFolderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);

  const data = createFolderSchema.parse(input);
  // Sans projet : dossier de documents libres.
  const projectId = data.projectId || null;
  const parentId = data.parentId || undefined;
  if (parentId) await assertFolderScope(parentId, projectId);

  const folder = await prisma.documentFolder.create({
    data: {
      projectId,
      parentId,
      nom: data.nom,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "document_folder.created",
    entityType: "DocumentFolder",
    entityId: folder.id,
    changes: { nom: folder.nom, projectId },
  });

  revalidateFolderPaths(projectId);
  return folder;
}

export async function updateFolder(input: UpdateFolderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);

  const data = updateFolderSchema.parse(input);
  const folder = await withNotFoundMessage(
    () => prisma.documentFolder.update({ where: { id: data.id }, data: { nom: data.nom } }),
    "Dossier introuvable."
  );

  await logAudit({
    userId: session.user.id,
    action: "document_folder.renamed",
    entityType: "DocumentFolder",
    entityId: folder.id,
    changes: { nom: folder.nom },
  });

  revalidateFolderPaths(folder.projectId);
  return folder;
}

/**
 * Supprime un dossier SANS supprimer son contenu : ses documents et ses
 * sous-dossiers remontent d'un niveau (dans le dossier parent, ou a la
 * racine de l'espace). Un document ne disparait donc jamais avec un dossier
 * — la suppression d'un document reste un geste explicite (corbeille).
 */
export async function deleteFolder(folderId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);

  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: { id: true, nom: true, projectId: true, parentId: true },
  });
  if (!folder) throw new Error("Dossier introuvable.");

  const [movedDocuments, movedFolders] = await prisma.$transaction([
    prisma.document.updateMany({ where: { folderId: folder.id }, data: { folderId: folder.parentId } }),
    prisma.documentFolder.updateMany({ where: { parentId: folder.id }, data: { parentId: folder.parentId } }),
    prisma.documentFolder.delete({ where: { id: folder.id } }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "document_folder.deleted",
    entityType: "DocumentFolder",
    entityId: folder.id,
    changes: { nom: folder.nom, documentsDeplaces: movedDocuments.count, sousDossiersDeplaces: movedFolders.count },
  });

  revalidateFolderPaths(folder.projectId);
  return { movedDocuments: movedDocuments.count, movedFolders: movedFolders.count };
}

/** Range un document dans un dossier de son espace, ou l'en retire (folderId vide). */
export async function moveDocumentToFolder(input: MoveDocumentToFolderInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const data = moveDocumentToFolderSchema.parse(input);
  const document = await prisma.document.findUnique({
    where: { id: data.documentId },
    select: { id: true, projectId: true, folderId: true },
  });
  if (!document) throw new Error("Document introuvable.");

  const folderId = data.folderId || null;
  if (folderId) await assertFolderScope(folderId, document.projectId);

  await prisma.document.update({ where: { id: document.id }, data: { folderId } });

  await logAudit({
    userId: session.user.id,
    action: folderId ? "document.moved_to_folder" : "document.removed_from_folder",
    entityType: "Document",
    entityId: document.id,
    changes: { folderId, previousFolderId: document.folderId },
  });

  revalidateFolderPaths(document.projectId);
  revalidatePath(`/documents/${document.id}`);
}

/**
 * Clic droit sur un document > "Nouveau dossier avec ce document" : cree le
 * dossier dans le meme espace (meme projet, ou libre) et au meme niveau que
 * le document, puis l'y range — en une transaction, pour ne pas laisser un
 * dossier vide si le deplacement echouait.
 */
export async function createFolderWithDocument(input: CreateFolderWithDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const data = createFolderWithDocumentSchema.parse(input);
  const document = await prisma.document.findUnique({
    where: { id: data.documentId },
    select: { id: true, projectId: true, folderId: true },
  });
  if (!document) throw new Error("Document introuvable.");

  const folder = await prisma.$transaction(async (tx) => {
    const created = await tx.documentFolder.create({
      data: {
        projectId: document.projectId,
        parentId: document.folderId,
        nom: data.nom,
        createdById: session.user.id,
      },
    });
    await tx.document.update({ where: { id: document.id }, data: { folderId: created.id } });
    return created;
  });

  await logAudit({
    userId: session.user.id,
    action: "document_folder.created",
    entityType: "DocumentFolder",
    entityId: folder.id,
    changes: { nom: folder.nom, projectId: document.projectId, avecDocument: document.id },
  });

  revalidateFolderPaths(document.projectId);
  revalidatePath(`/documents/${document.id}`);
  return folder;
}

// Project Data Room (Project Studio §38) — dossiers standards suggeres par
// le cahier des charges. Ignore silencieusement les noms deja presents a la
// racine plutot que de dupliquer si l'utilisateur relance l'action.
const STANDARD_FOLDER_NAMES = [
  "Conception",
  "Contrats",
  "Budget",
  "Financement",
  "Rapports",
  "Études",
  "Données",
  "Communication",
  "Évaluations",
  "Pièces justificatives",
];

export async function generateStandardDocumentFolders(projectId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_MANAGE_FOLDERS);

  const existing = await prisma.documentFolder.findMany({
    where: { projectId, parentId: null },
    select: { nom: true },
  });
  const existingNames = new Set(existing.map((f) => f.nom));
  const toCreate = STANDARD_FOLDER_NAMES.filter((nom) => !existingNames.has(nom));

  if (toCreate.length === 0) {
    return { created: 0 };
  }

  await prisma.documentFolder.createMany({
    data: toCreate.map((nom) => ({ projectId, nom, createdById: session.user.id })),
  });

  await logAudit({
    userId: session.user.id,
    action: "document_folder.standard_generated",
    entityType: "DocumentFolder",
    entityId: projectId,
    changes: { count: toCreate.length },
  });

  revalidatePath("/documents");
  revalidatePath(`/projets/${projectId}`);
  return { created: toCreate.length };
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_CREATE);

  const data = createDocumentSchema.parse(input);
  // Document libre (sans projet) : les phases sont propres a un projet, on
  // ne les rattache donc qu'en presence d'un projet.
  const projectId = data.projectId || undefined;
  const departmentId = data.departmentId || undefined;
  // Dossier : de projet pour un document de projet, libre pour un document
  // libre — jamais l'un dans l'autre.
  const folderId = data.folderId || undefined;
  if (folderId) await assertFolderScope(folderId, projectId ?? null);

  const document = await prisma.document.create({
    data: {
      projectId,
      departmentId,
      folderId,
      sectionId: projectId ? data.sectionId || undefined : undefined,
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
    changes: { nom: document.nom, projectId: projectId ?? null, departmentId: departmentId ?? null },
  });

  // Document envoye a un departement : ses membres actifs sont notifies
  // (l'auteur exclu par notifyMany).
  if (departmentId) {
    const members = await prisma.user.findMany({
      where: { departmentId, isActive: true },
      select: { id: true },
    });
    await notifyMany(
      members.map((m) => m.id),
      session.user.id,
      {
        type: "DOCUMENT_DEPARTEMENT",
        titre: `Nouveau document pour votre département : ${document.nom}`,
        lien: `/documents/${document.id}`,
        entityType: "Document",
        entityId: document.id,
      }
    );
  }

  revalidatePath("/documents");
  if (projectId) revalidatePath(`/projets/${projectId}`);
  if (projectId && data.sectionId) revalidatePath(`/projets/${projectId}/sections/${data.sectionId}`);
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

/** Project Studio §39 (Version Control) — validation interne d'une version précise, distincte de la validation externe (portail) au niveau du document. */
export async function setDocumentVersionValidation(input: SetDocumentVersionValidationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const data = setDocumentVersionValidationSchema.parse(input);

  const version = await prisma.documentVersion.update({
    where: { id: data.versionId },
    data: {
      valide: data.valide,
      valideParId: data.valide ? session.user.id : null,
      valideLe: data.valide ? new Date() : null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.version_validation_updated",
    entityType: "DocumentVersion",
    entityId: version.id,
    changes: { valide: data.valide },
  });

  revalidatePath(`/documents/${version.documentId}`);
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

/**
 * Demande de validation client (cahier des charges §21) : un membre interne
 * marque un livrable comme "a valider" ; seul le partenaire/prestataire
 * rattache a la mission (Task.externalContactId) pourra ensuite le valider
 * ou le rejeter depuis le portail.
 */
export async function requestExternalValidation(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);

  const document = await withNotFoundMessage(
    () => prisma.document.findUniqueOrThrow({ where: { id: documentId }, include: { task: true } }),
    "Document introuvable."
  );
  if (!document.task?.externalContactId) {
    throw new Error("Ce document n'est pas rattaché à une mission avec un partenaire externe.");
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { validationExterne: "EN_ATTENTE", dateValidationExterne: null, commentaireValidationExterne: null },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.external_validation_requested",
    entityType: "Document",
    entityId: documentId,
    changes: {},
  });

  revalidatePath(`/documents/${documentId}`);
  return updated;
}

async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Depot d'un document depuis le portail externe (cahier des charges §21). */
export async function depositPortalDocument(input: DepositPortalDocumentInput) {
  const portalSession = await requirePortalSession();
  const data = depositPortalDocumentSchema.parse(input);

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: data.taskId },
    select: { id: true, projectId: true, externalContactId: true, titre: true, responsablePrincipalId: true },
  });
  if (task.externalContactId !== portalSession.contactId) {
    throw new Error("Vous n'avez pas accès à cette mission.");
  }

  // Droits (cahier des charges V3.0 §25).
  const account = await prisma.portalAccount.findUnique({
    where: { contactId: portalSession.contactId },
    select: { droitTeleversement: true },
  });
  if (account && !account.droitTeleversement) {
    throw new Error("Le téléversement de documents n'est pas activé pour ce compte.");
  }

  const document = await prisma.document.create({
    data: {
      projectId: task.projectId,
      taskId: task.id,
      nom: data.nom,
      description: data.description,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedByContactId: portalSession.contactId,
    },
  });

  await createNotification({
    userId: task.responsablePrincipalId,
    type: "MODIFICATION",
    titre: `Un document a été déposé sur la mission « ${task.titre} » par le partenaire.`,
    lien: `/taches/${task.id}`,
    entityType: "Document",
    entityId: document.id,
  });

  revalidatePath(`/portail/missions/${task.id}`);
  revalidatePath(`/taches/${task.id}`);
  return document;
}

/** Validation ou rejet d'un livrable par le partenaire/prestataire, depuis le portail. */
export async function reviewPortalDeliverable(input: ReviewPortalDeliverableInput) {
  const portalSession = await requirePortalSession();
  const data = reviewPortalDeliverableSchema.parse(input);

  const document = await withNotFoundMessage(
    () => prisma.document.findUniqueOrThrow({ where: { id: data.documentId }, include: { task: true } }),
    "Document introuvable."
  );
  if (document.task?.externalContactId !== portalSession.contactId) {
    throw new Error("Vous n'avez pas accès à ce document.");
  }
  if (document.validationExterne !== "EN_ATTENTE") {
    throw new Error("Ce document n'est pas en attente de validation.");
  }

  const updated = await prisma.document.update({
    where: { id: data.documentId },
    data: {
      validationExterne: data.decision,
      dateValidationExterne: new Date(),
      commentaireValidationExterne: data.commentaire || undefined,
    },
  });

  if (document.task.responsablePrincipalId) {
    await createNotification({
      userId: document.task.responsablePrincipalId,
      type: "VALIDATION",
      titre:
        data.decision === "VALIDE"
          ? `Le livrable « ${document.nom} » a été validé par le partenaire.`
          : `Le livrable « ${document.nom} » a été rejeté par le partenaire.`,
      lien: `/documents/${document.id}`,
      entityType: "Document",
      entityId: document.id,
    });
  }

  revalidatePath(`/portail/missions/${document.taskId}`);
  if (document.taskId) revalidatePath(`/taches/${document.taskId}`);
  revalidatePath(`/documents/${document.id}`);
  return updated;
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
