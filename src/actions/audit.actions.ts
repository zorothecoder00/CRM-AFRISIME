"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";
import {
  createAuditPlanSchema,
  updateAuditPlanSchema,
  addAuditPlanMemberSchema,
  addAuditPlanDocumentSchema,
  createAuditMissionSchema,
  updateAuditMissionSchema,
  createAuditFindingSchema,
  updateAuditFindingSchema,
  type CreateAuditPlanInput,
  type UpdateAuditPlanInput,
  type AddAuditPlanMemberInput,
  type AddAuditPlanDocumentInput,
  type CreateAuditMissionInput,
  type UpdateAuditMissionInput,
  type CreateAuditFindingInput,
  type UpdateAuditFindingInput,
} from "@/lib/validations/audit.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createAuditPlan(input: CreateAuditPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = createAuditPlanSchema.parse(input);

  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const plan = await prisma.auditPlan.create({
    data: {
      titre: data.titre,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      perimetre: data.perimetre,
      objectifs: data.objectifs,
      criteres: data.criteres,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_plan.created",
    entityType: "AuditPlan",
    entityId: plan.id,
    changes: { titre: plan.titre },
  });

  revalidatePath("/audit");
  return plan;
}

export async function updateAuditPlan(input: UpdateAuditPlanInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = updateAuditPlanSchema.parse(input);

  if (new Date(data.dateFin) < new Date(data.dateDebut)) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const plan = await prisma.auditPlan.update({
    where: { id: data.planId },
    data: {
      titre: data.titre,
      dateDebut: new Date(data.dateDebut),
      dateFin: new Date(data.dateFin),
      perimetre: data.perimetre,
      objectifs: data.objectifs,
      criteres: data.criteres,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_plan.updated",
    entityType: "AuditPlan",
    entityId: plan.id,
    changes: { titre: plan.titre },
  });

  revalidatePath("/audit");
  revalidatePath(`/audit/${plan.id}`);
  return plan;
}

export async function addAuditPlanMember(input: AddAuditPlanMemberInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = addAuditPlanMemberSchema.parse(input);

  const member = await prisma.auditPlanMember.upsert({
    where: { planId_userId: { planId: data.planId, userId: data.userId } },
    update: {},
    create: { planId: data.planId, userId: data.userId },
  });

  await createNotification({
    userId: data.userId,
    type: "NOUVELLE_TACHE",
    titre: "Vous avez été ajouté à une équipe d'audit interne.",
    lien: `/audit/${data.planId}`,
    entityType: "AuditPlan",
    entityId: data.planId,
  });

  revalidatePath(`/audit/${data.planId}`);
  return member;
}

export async function removeAuditPlanMember(memberId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const member = await prisma.auditPlanMember.delete({ where: { id: memberId } });
  revalidatePath(`/audit/${member.planId}`);
}

export async function addAuditPlanDocument(input: AddAuditPlanDocumentInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = addAuditPlanDocumentSchema.parse(input);

  const document = await prisma.auditPlanDocument.create({
    data: {
      planId: data.planId,
      nom: data.nom,
      url: data.url,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      uploadedById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_plan.document_added",
    entityType: "AuditPlan",
    entityId: data.planId,
    changes: { nom: document.nom },
  });

  revalidatePath(`/audit/${data.planId}`);
  return document;
}

export async function deleteAuditPlanDocument(documentId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const document = await prisma.auditPlanDocument.delete({ where: { id: documentId } });
  revalidatePath(`/audit/${document.planId}`);
}

export async function createAuditMission(input: CreateAuditMissionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = createAuditMissionSchema.parse(input);

  const mission = await prisma.auditMission.create({
    data: {
      planId: data.planId,
      titre: data.titre,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_mission.created",
    entityType: "AuditMission",
    entityId: mission.id,
    changes: { titre: mission.titre },
  });

  revalidatePath(`/audit/${data.planId}`);
  return mission;
}

export async function updateAuditMission(input: UpdateAuditMissionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = updateAuditMissionSchema.parse(input);

  const mission = await prisma.auditMission.update({
    where: { id: data.missionId },
    data: { titre: data.titre, statut: data.statut, rapport: data.rapport },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_mission.updated",
    entityType: "AuditMission",
    entityId: mission.id,
    changes: { statut: mission.statut },
  });

  revalidatePath(`/audit/${mission.planId}`);
  revalidatePath(`/audit/${mission.planId}/missions/${mission.id}`);
  return mission;
}

export async function createAuditFinding(input: CreateAuditFindingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = createAuditFindingSchema.parse(input);

  const mission = await prisma.auditMission.findUniqueOrThrow({
    where: { id: data.missionId },
    select: { planId: true },
  });

  const finding = await prisma.auditFinding.create({
    data: {
      missionId: data.missionId,
      constat: data.constat,
      recommandation: data.recommandation,
      responsableId: data.responsableId || undefined,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_finding.created",
    entityType: "AuditFinding",
    entityId: finding.id,
    changes: { constat: finding.constat },
  });

  if (finding.responsableId) {
    await createNotification({
      userId: finding.responsableId,
      type: "NOUVELLE_TACHE",
      titre: "Un constat d'audit vous a été assigné.",
      lien: `/audit/${mission.planId}/missions/${data.missionId}`,
      entityType: "AuditFinding",
      entityId: finding.id,
    });
  }

  revalidatePath(`/audit/${mission.planId}/missions/${data.missionId}`);
  return finding;
}

export async function updateAuditFinding(input: UpdateAuditFindingInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.AUDIT_MANAGE);

  const data = updateAuditFindingSchema.parse(input);

  const finding = await prisma.auditFinding.update({
    where: { id: data.findingId },
    data: {
      constat: data.constat,
      recommandation: data.recommandation,
      responsableId: data.responsableId || null,
      echeance: data.echeance ? new Date(data.echeance) : null,
      statut: data.statut,
    },
    include: { mission: { select: { planId: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "audit_finding.updated",
    entityType: "AuditFinding",
    entityId: finding.id,
    changes: { statut: finding.statut },
  });

  revalidatePath(`/audit/${finding.mission.planId}/missions/${finding.missionId}`);
  return finding;
}
