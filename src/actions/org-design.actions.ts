"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { simulateOrgDesign, deployOrgDesign } from "@/lib/org-designer";
import {
  createOrgDesignDraftSchema,
  updateOrgDesignDraftSchema,
  idSchema,
  type CreateOrgDesignDraftInput,
  type UpdateOrgDesignDraftInput,
  type IdInput,
} from "@/lib/validations/org-design.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Organizational Designer (cahier des charges V3.0 §21). */
export async function createOrgDesignDraft(input: CreateOrgDesignDraftInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = createOrgDesignDraftSchema.parse(input);

  const draft = await prisma.orgDesignDraft.create({
    data: {
      nom: data.nom,
      description: data.description || undefined,
      structure: data.structure,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "org_design_draft.created",
    entityType: "OrgDesignDraft",
    entityId: draft.id,
    changes: { nom: draft.nom },
  });

  revalidatePath("/organisation-virtuelle");
  return { id: draft.id };
}

export async function updateOrgDesignDraft(input: UpdateOrgDesignDraftInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const data = updateOrgDesignDraftSchema.parse(input);

  const existing = await prisma.orgDesignDraft.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.statut === "DEPLOYE") {
    throw new Error("Ce brouillon a déjà été déployé, il n'est plus modifiable.");
  }

  const draft = await prisma.orgDesignDraft.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      description: data.description || undefined,
      structure: data.structure,
      statut: "BROUILLON",
      simulationResume: undefined,
    },
  });

  revalidatePath(`/organisation-virtuelle/${draft.id}`);
  revalidatePath("/organisation-virtuelle");
  return { id: draft.id };
}

/** Simule l'impact du brouillon sans rien écrire dans les vraies tables (§21 : "peut être simulé avant déploiement réel"). */
export async function simulateOrgDesignDraft(input: IdInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const { id } = idSchema.parse(input);

  const draft = await prisma.orgDesignDraft.findUniqueOrThrow({ where: { id } });
  if (draft.statut === "DEPLOYE") {
    throw new Error("Ce brouillon a déjà été déployé.");
  }

  const structure = draft.structure as unknown as Parameters<typeof simulateOrgDesign>[0];
  const resume = await simulateOrgDesign(structure);

  await prisma.orgDesignDraft.update({
    where: { id },
    data: { statut: "SIMULE", simulationResume: resume, simulatedAt: new Date() },
  });

  revalidatePath(`/organisation-virtuelle/${id}`);
  return resume;
}

/** Déploie réellement le brouillon simulé : crée les Department/Team/Project/Processus (§21). */
export async function deployOrgDesignDraft(input: IdInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const { id } = idSchema.parse(input);

  const draft = await prisma.orgDesignDraft.findUniqueOrThrow({ where: { id } });
  if (draft.statut === "DEPLOYE") {
    throw new Error("Ce brouillon a déjà été déployé.");
  }
  if (draft.statut !== "SIMULE") {
    throw new Error("Simulez le brouillon avant de le déployer.");
  }

  const structure = draft.structure as unknown as Parameters<typeof deployOrgDesign>[0];
  const rootDepartmentId = await deployOrgDesign(structure, session.user.id);

  await prisma.orgDesignDraft.update({
    where: { id },
    data: { statut: "DEPLOYE", deployedDepartmentId: rootDepartmentId, deployedAt: new Date() },
  });

  await logAudit({
    userId: session.user.id,
    action: "org_design_draft.deployed",
    entityType: "OrgDesignDraft",
    entityId: id,
    changes: { rootDepartmentId },
  });

  revalidatePath(`/organisation-virtuelle/${id}`);
  revalidatePath("/organisation-virtuelle");
  revalidatePath("/administration/departements");
  revalidatePath("/graphe-organisationnel");
  return { rootDepartmentId };
}

export async function deleteOrgDesignDraft(input: IdInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.DEPARTMENT_MANAGE);
  const { id } = idSchema.parse(input);

  const draft = await prisma.orgDesignDraft.findUniqueOrThrow({ where: { id } });
  if (draft.statut === "DEPLOYE") {
    throw new Error("Un brouillon déployé est conservé comme historique et ne peut pas être supprimé.");
  }

  await prisma.orgDesignDraft.delete({ where: { id } });

  revalidatePath("/organisation-virtuelle");
}
