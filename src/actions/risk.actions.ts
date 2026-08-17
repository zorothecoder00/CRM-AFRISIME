"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notifyMany } from "@/lib/notify";
import { computeCriticite } from "@/lib/risk-matrix";
import { runOrganizationalRiskCreatedRules } from "@/lib/automation";
import {
  createOrganizationalRiskSchema,
  updateOrganizationalRiskSchema,
  type CreateOrganizationalRiskInput,
  type UpdateOrganizationalRiskInput,
} from "@/lib/validations/risk.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

async function nextRiskCode() {
  const count = await prisma.organizationalRisk.count();
  return `R-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Alertes automatiques (cahier des charges v2 §5.3) : responsable, chef de
 * projet (si le risque est rattaché à un projet), manager du responsable
 * (même mécanisme que l'escalade des automatisations, src/lib/automation.ts)
 * — et la direction (DIRECTEUR_GENERAL/DIRECTEUR), mais seulement pour les
 * criticités ÉLEVÉ/CRITIQUE : les alerter à chaque risque mineur noierait le
 * signal.
 */
async function notifyRiskStakeholders(risk: {
  id: string;
  titre: string;
  criticite: string;
  responsableId: string | null;
  projectId: string | null;
}, actingUserId: string) {
  const recipientIds = new Set<string>();

  if (risk.responsableId) recipientIds.add(risk.responsableId);

  if (risk.responsableId) {
    const responsable = await prisma.user.findUnique({
      where: { id: risk.responsableId },
      select: { managerId: true },
    });
    if (responsable?.managerId) recipientIds.add(responsable.managerId);
  }

  if (risk.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: risk.projectId },
      select: { responsableId: true },
    });
    if (project?.responsableId) recipientIds.add(project.responsableId);
  }

  if (risk.criticite === "ELEVE" || risk.criticite === "CRITIQUE") {
    const direction = await prisma.user.findMany({
      where: { isActive: true, role: { key: { in: ["DIRECTEUR_GENERAL", "DIRECTEUR"] } } },
      select: { id: true },
    });
    for (const d of direction) recipientIds.add(d.id);
  }

  await notifyMany(Array.from(recipientIds), actingUserId, {
    type: "TACHE_CRITIQUE",
    titre: `Risque ${risk.criticite === "CRITIQUE" ? "critique" : risk.criticite.toLowerCase()} : ${risk.titre}`,
    lien: `/risques/${risk.id}`,
    entityType: "OrganizationalRisk",
    entityId: risk.id,
  });
}

export async function createOrganizationalRisk(input: CreateOrganizationalRiskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);

  const data = createOrganizationalRiskSchema.parse(input);
  const criticite = computeCriticite(data.probabilite, data.impact);
  const code = await nextRiskCode();

  const risk = await prisma.organizationalRisk.create({
    data: {
      code,
      titre: data.titre,
      description: data.description,
      categorie: data.categorie,
      origine: data.origine,
      probabilite: data.probabilite,
      impact: data.impact,
      criticite,
      responsableId: data.responsableId || undefined,
      projectId: data.projectId || undefined,
      processusId: data.processusId || undefined,
      mesuresPreventives: data.mesuresPreventives,
      planMitigation: data.planMitigation,
      echeance: data.echeance ? new Date(data.echeance) : undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "organizational_risk.created",
    entityType: "OrganizationalRisk",
    entityId: risk.id,
    changes: { code: risk.code, titre: risk.titre, criticite },
  });

  await notifyRiskStakeholders(risk, session.user.id);

  await runOrganizationalRiskCreatedRules({
    id: risk.id,
    titre: risk.titre,
    responsableId: risk.responsableId,
    criticite: risk.criticite,
  });

  revalidatePath("/risques");
  return risk;
}

export async function updateOrganizationalRisk(input: UpdateOrganizationalRiskInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);

  const data = updateOrganizationalRiskSchema.parse(input);
  const criticite = computeCriticite(data.probabilite, data.impact);

  const risk = await prisma.organizationalRisk.update({
    where: { id: data.riskId },
    data: {
      titre: data.titre,
      description: data.description,
      categorie: data.categorie,
      origine: data.origine,
      probabilite: data.probabilite,
      impact: data.impact,
      criticite,
      responsableId: data.responsableId || null,
      projectId: data.projectId || null,
      processusId: data.processusId || null,
      mesuresPreventives: data.mesuresPreventives,
      planMitigation: data.planMitigation,
      echeance: data.echeance ? new Date(data.echeance) : null,
      statut: data.statut,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "organizational_risk.updated",
    entityType: "OrganizationalRisk",
    entityId: risk.id,
    changes: { criticite, statut: data.statut },
  });

  if (risk.statut !== "CLOS" && risk.statut !== "MAITRISE") {
    await notifyRiskStakeholders(risk, session.user.id);
  }

  revalidatePath("/risques");
  revalidatePath(`/risques/${risk.id}`);
  return risk;
}

/** Déclenchement manuel d'une alerte (cahier des charges v2 §5.3), en plus des alertes automatiques à la création/mise à jour. */
export async function triggerRiskAlert(riskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);

  const risk = await prisma.organizationalRisk.findUniqueOrThrow({ where: { id: riskId } });
  await notifyRiskStakeholders(risk, session.user.id);

  await logAudit({
    userId: session.user.id,
    action: "organizational_risk.alert_triggered",
    entityType: "OrganizationalRisk",
    entityId: risk.id,
    changes: { criticite: risk.criticite },
  });
}

export async function deleteOrganizationalRisk(riskId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.RISK_MANAGE);

  const risk = await prisma.organizationalRisk.delete({ where: { id: riskId } });

  await logAudit({
    userId: session.user.id,
    action: "organizational_risk.deleted",
    entityType: "OrganizationalRisk",
    entityId: riskId,
    changes: { titre: risk.titre },
  });

  revalidatePath("/risques");
}
