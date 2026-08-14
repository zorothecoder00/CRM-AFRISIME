"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import {
  createInstanceSchema,
  addInstanceMemberSchema,
  updateInstanceMemberStatusSchema,
  createGovernanceMeetingSchema,
  updateGovernanceMeetingSchema,
  addGovernanceDecisionSchema,
  updateGovernanceDecisionStatusSchema,
  addGovernanceMeetingDocumentSchema,
  type CreateInstanceInput,
  type AddInstanceMemberInput,
  type CreateGovernanceMeetingInput,
  type UpdateGovernanceMeetingInput,
  type AddGovernanceDecisionInput,
  type AddGovernanceMeetingDocumentInput,
} from "@/lib/validations/gouvernance.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createInstance(input: CreateInstanceInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = createInstanceSchema.parse(input);

  const instance = await prisma.governanceInstance.create({
    data: {
      nom: data.nom,
      type: data.type,
      description: data.description,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_instance.created",
    entityType: "GovernanceInstance",
    entityId: instance.id,
    changes: { nom: instance.nom, type: instance.type },
  });

  revalidatePath("/gouvernance");
  return instance;
}

export async function addInstanceMember(input: AddInstanceMemberInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = addInstanceMemberSchema.parse(input);

  const member = await prisma.governanceInstanceMember.create({
    data: {
      instanceId: data.instanceId,
      userId: data.userId,
      fonction: data.fonction,
      role: data.role,
      mandat: data.mandat,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
      dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_instance.member_added",
    entityType: "GovernanceInstance",
    entityId: data.instanceId,
    changes: { userId: data.userId },
  });

  revalidatePath(`/gouvernance/${data.instanceId}`);
  return member;
}

export async function updateInstanceMemberStatus(memberId: string, statut: "ACTIF" | "TERMINE" | "SUSPENDU") {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = updateInstanceMemberStatusSchema.parse({ memberId, statut });

  const member = await prisma.governanceInstanceMember.update({
    where: { id: data.memberId },
    data: { statut: data.statut },
  });

  revalidatePath(`/gouvernance/${member.instanceId}`);
  return member;
}

export async function removeInstanceMember(memberId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const member = await prisma.governanceInstanceMember.delete({ where: { id: memberId } });

  revalidatePath(`/gouvernance/${member.instanceId}`);
}

export async function createGovernanceMeeting(input: CreateGovernanceMeetingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = createGovernanceMeetingSchema.parse(input);
  const participantIds = Array.from(new Set([...data.participantIds, session.user.id]));

  const meeting = await prisma.governanceMeeting.create({
    data: {
      instanceId: data.instanceId,
      titre: data.titre,
      dateHeure: new Date(data.dateHeure),
      lieu: data.lieu,
      ordreDuJour: data.ordreDuJour,
      createdById: session.user.id,
      participants: { create: participantIds.map((userId) => ({ userId })) },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_meeting.created",
    entityType: "GovernanceMeeting",
    entityId: meeting.id,
    changes: { titre: meeting.titre, instanceId: data.instanceId },
  });

  revalidatePath(`/gouvernance/${data.instanceId}`);
  return meeting;
}

export async function updateGovernanceMeeting(input: UpdateGovernanceMeetingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = updateGovernanceMeetingSchema.parse(input);

  const meeting = await prisma.governanceMeeting.update({
    where: { id: data.meetingId },
    data: { compteRendu: data.compteRendu, statut: data.statut },
  });

  revalidatePath(`/gouvernance/reunions/${data.meetingId}`);
  revalidatePath(`/gouvernance/${meeting.instanceId}`);
  return meeting;
}

/**
 * Workflow (cahier des charges v2 §3.2D) : Réunion → Décision → Action →
 * Responsable → Échéance → Contrôle → Clôture. Contrairement à
 * MeetingDecision, aucune Task n'est auto-créée : Task.projectId est
 * obligatoire et une réunion de gouvernance n'appartient à aucun projet.
 * La décision porte elle-même responsable/échéance/priorité/statut — le
 * cycle "action" complet reste intégralement suivi sans Task, via le champ
 * `statut` (EN_COURS → TRAITEE/ANNULEE fait office de contrôle/clôture).
 */
export async function addGovernanceDecision(input: AddGovernanceDecisionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = addGovernanceDecisionSchema.parse(input);

  const decision = await prisma.governanceDecision.create({
    data: {
      meetingId: data.meetingId,
      reference: data.reference,
      objet: data.objet,
      contexte: data.contexte,
      decision: data.decision,
      responsableId: data.responsableId,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      priorite: data.priorite,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_decision.created",
    entityType: "GovernanceDecision",
    entityId: decision.id,
    changes: { objet: decision.objet, meetingId: data.meetingId },
  });

  if (data.responsableId !== session.user.id) {
    await createNotification({
      userId: data.responsableId,
      type: "NOUVELLE_TACHE",
      titre: `Décision de gouvernance à traiter : ${decision.objet}`,
      lien: `/gouvernance/reunions/${data.meetingId}`,
      entityType: "GovernanceDecision",
      entityId: decision.id,
    });
  }

  revalidatePath(`/gouvernance/reunions/${data.meetingId}`);
  return decision;
}

export async function addGovernanceMeetingDocument(input: AddGovernanceMeetingDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = addGovernanceMeetingDocumentSchema.parse(input);

  const document = await prisma.governanceMeetingDocument.create({
    data: {
      meetingId: data.meetingId,
      nom: data.nom,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_meeting.document_added",
    entityType: "GovernanceMeeting",
    entityId: data.meetingId,
    changes: { nom: document.nom },
  });

  revalidatePath(`/gouvernance/reunions/${data.meetingId}`);
  return document;
}

export async function deleteGovernanceMeetingDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const document = await prisma.governanceMeetingDocument.delete({ where: { id: documentId } });

  revalidatePath(`/gouvernance/reunions/${document.meetingId}`);
}

export async function updateGovernanceDecisionStatus(decisionId: string, statut: "EN_COURS" | "TRAITEE" | "ANNULEE") {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.GOVERNANCE_MANAGE);

  const data = updateGovernanceDecisionStatusSchema.parse({ decisionId, statut });

  const decision = await prisma.governanceDecision.update({
    where: { id: data.decisionId },
    data: { statut: data.statut },
  });

  await logAudit({
    userId: session.user.id,
    action: "governance_decision.status_updated",
    entityType: "GovernanceDecision",
    entityId: decision.id,
    changes: { statut: data.statut },
  });

  revalidatePath(`/gouvernance/reunions/${decision.meetingId}`);
  return decision;
}
