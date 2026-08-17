"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getPortalSession } from "@/lib/portal-auth";
import { createNotification } from "@/lib/notify";
import { isProjectAuthorized } from "@/lib/portal-authorization";
import {
  sendPortalMessageSchema,
  replyPortalMessageSchema,
  updateMeetingRsvpSchema,
  inviteContactToMeetingSchema,
  togglePartageExterneSchema,
  createBeneficiaireSchema,
  type SendPortalMessageInput,
  type ReplyPortalMessageInput,
  type UpdateMeetingRsvpInput,
  type InviteContactToMeetingInput,
  type TogglePartageExterneInput,
  type CreateBeneficiaireInput,
} from "@/lib/validations/portal.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Envoi d'un message depuis le portail externe (cahier des charges §16-18, "communiquer"). */
export async function sendPortalMessage(input: SendPortalMessageInput) {
  const portalSession = await requirePortalSession();
  const data = sendPortalMessageSchema.parse(input);

  const contact = await prisma.crmContact.findUniqueOrThrow({
    where: { id: portalSession.contactId },
    select: { id: true, prenom: true, nom: true, ownerId: true },
  });

  const message = await prisma.portalMessage.create({
    data: {
      contactId: contact.id,
      authorType: "CONTACT",
      content: data.content,
      isReadByInternal: false,
    },
  });

  if (contact.ownerId) {
    await createNotification({
      userId: contact.ownerId,
      type: "COMMENTAIRE",
      titre: `Nouveau message de ${contact.prenom} ${contact.nom} sur le portail.`,
      lien: `/crm/contacts/${contact.id}`,
      entityType: "PortalMessage",
      entityId: message.id,
    });
  }

  revalidatePath("/portail/messages");
  return { id: message.id };
}

/** Réponse d'un membre interne à un fil de messagerie portail, depuis la fiche contact. */
export async function replyPortalMessage(input: ReplyPortalMessageInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = replyPortalMessageSchema.parse(input);

  const message = await prisma.portalMessage.create({
    data: {
      contactId: data.contactId,
      authorType: "INTERNAL",
      authorUserId: session.user.id,
      content: data.content,
      isReadByContact: false,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "portal_message.replied",
    entityType: "PortalMessage",
    entityId: message.id,
    changes: { contactId: data.contactId },
  });

  revalidatePath(`/crm/contacts/${data.contactId}`);
  return { id: message.id };
}

/** Marque le fil comme lu côté portail (visite de /portail/messages). */
// Ces deux fonctions sont appelees pendant le rendu des pages portail/fiche
// contact (visite = lecture), jamais depuis un composant client — pas de
// revalidatePath ici : Next.js interdit son appel pendant un rendu de
// Server Component (reserve aux Server Actions/handlers de route).
export async function markPortalMessagesReadByContact() {
  const portalSession = await requirePortalSession();
  await prisma.portalMessage.updateMany({
    where: { contactId: portalSession.contactId, authorType: "INTERNAL", isReadByContact: false },
    data: { isReadByContact: true },
  });
}

/** Marque le fil comme lu côté interne (visite de la fiche contact). */
export async function markPortalMessagesReadByInternal(contactId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  await prisma.portalMessage.updateMany({
    where: { contactId, authorType: "CONTACT", isReadByInternal: false },
    data: { isReadByInternal: true },
  });
}

/** Réponse RSVP à une invitation de réunion externe (cahier des charges §17). */
export async function updateMeetingRsvp(input: UpdateMeetingRsvpInput) {
  const portalSession = await requirePortalSession();
  const data = updateMeetingRsvpSchema.parse(input);

  const participant = await prisma.meetingExternalParticipant.findUniqueOrThrow({
    where: { id: data.participantId },
    include: { meeting: { select: { id: true, titre: true, createdById: true } } },
  });
  if (participant.contactId !== portalSession.contactId) {
    throw new Error("Vous n'avez pas accès à cette invitation.");
  }

  const updated = await prisma.meetingExternalParticipant.update({
    where: { id: data.participantId },
    data: { rsvp: data.rsvp, respondedAt: new Date() },
  });

  await createNotification({
    userId: participant.meeting.createdById,
    type: "MODIFICATION",
    titre:
      data.rsvp === "CONFIRME"
        ? `${portalSession.name} a confirmé sa participation à « ${participant.meeting.titre} ».`
        : `${portalSession.name} a décliné l'invitation à « ${participant.meeting.titre} ».`,
    lien: `/reunions/${participant.meeting.id}`,
    entityType: "MeetingExternalParticipant",
    entityId: updated.id,
  });

  revalidatePath("/portail/reunions");
  return { id: updated.id };
}

/** Invitation d'un contact externe à une réunion, depuis la fiche réunion interne. */
export async function inviteContactToMeeting(input: InviteContactToMeetingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_MANAGE_PARTICIPANTS);
  const data = inviteContactToMeetingSchema.parse(input);

  const participant = await prisma.meetingExternalParticipant.upsert({
    where: { meetingId_contactId: { meetingId: data.meetingId, contactId: data.contactId } },
    update: {},
    create: { meetingId: data.meetingId, contactId: data.contactId },
  });

  await logAudit({
    userId: session.user.id,
    action: "meeting.external_participant_invited",
    entityType: "Meeting",
    entityId: data.meetingId,
    changes: { contactId: data.contactId },
  });

  revalidatePath(`/reunions/${data.meetingId}`);
  return { id: participant.id };
}

export async function removeExternalMeetingParticipant(participantId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEETING_MANAGE_PARTICIPANTS);

  const participant = await prisma.meetingExternalParticipant.delete({ where: { id: participantId } });

  await logAudit({
    userId: session.user.id,
    action: "meeting.external_participant_removed",
    entityType: "Meeting",
    entityId: participant.meetingId,
    changes: { contactId: participant.contactId },
  });

  revalidatePath(`/reunions/${participant.meetingId}`);
}

/**
 * Marque/démarque un document comme partageable au portail (cahier des
 * charges §19 — isolation des données confidentielles internes). Sans ce
 * flag, un document de projet n'apparaît jamais dans le portail, même pour
 * un contact autorisé sur le projet.
 */
export async function togglePartageExterne(input: TogglePartageExterneInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DOCUMENT_UPDATE);
  const data = togglePartageExterneSchema.parse(input);

  const document = await prisma.document.update({
    where: { id: data.documentId },
    data: { partageExterne: data.partageExterne },
  });

  await logAudit({
    userId: session.user.id,
    action: "document.partage_externe_updated",
    entityType: "Document",
    entityId: data.documentId,
    changes: { partageExterne: data.partageExterne },
  });

  revalidatePath(`/documents/${data.documentId}`);
  revalidatePath(`/projets/${document.projectId}`);
  return { id: document.id };
}

/** Enregistrement d'un bénéficiaire de programme/projet (cahier des charges §20). */
export async function createBeneficiaire(input: CreateBeneficiaireInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);
  const data = createBeneficiaireSchema.parse(input);

  const beneficiaire = await prisma.beneficiaire.create({
    data: {
      nom: data.nom,
      description: data.description,
      programmeId: data.programmeId || undefined,
      projectId: data.projectId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "beneficiaire.created",
    entityType: "Beneficiaire",
    entityId: beneficiaire.id,
    changes: { nom: beneficiaire.nom },
  });

  if (data.programmeId) revalidatePath(`/programmes/${data.programmeId}`);
  if (data.projectId) revalidatePath(`/projets/${data.projectId}`);
  return { id: beneficiaire.id };
}

export async function deleteBeneficiaire(beneficiaireId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.PROGRAM_MANAGE);

  const beneficiaire = await prisma.beneficiaire.delete({ where: { id: beneficiaireId } });

  await logAudit({
    userId: session.user.id,
    action: "beneficiaire.deleted",
    entityType: "Beneficiaire",
    entityId: beneficiaireId,
    changes: {},
  });

  if (beneficiaire.programmeId) revalidatePath(`/programmes/${beneficiaire.programmeId}`);
  if (beneficiaire.projectId) revalidatePath(`/projets/${beneficiaire.projectId}`);
}

/** Vérifie qu'un projet est bien accessible au contact du portail avant d'en afficher le détail. */
export async function assertPortalProjectAccess(contactId: string, projectId: string) {
  const authorized = await isProjectAuthorized(contactId, projectId);
  if (!authorized) throw new Error("Vous n'avez pas accès à ce projet.");
}
