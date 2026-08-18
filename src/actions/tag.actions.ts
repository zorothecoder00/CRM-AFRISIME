"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission, type PermissionKey } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { setEntityTagsSchema, type SetEntityTagsInput } from "@/lib/validations/tag.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

// Permission de gestion "naturelle" par type d'entite — le tag est une
// annexe de la fiche elle-meme, donc soumis au meme droit de modification
// que la fiche (pas une permission "tag.manage" separee).
const MANAGE_PERMISSION: Record<string, PermissionKey> = {
  Project: PERMISSIONS.PROJECT_UPDATE,
  Task: PERMISSIONS.TASK_UPDATE,
  Document: PERMISSIONS.DOCUMENT_UPDATE,
  Contract: PERMISSIONS.CRM_MANAGE,
  ProjectRisk: PERMISSIONS.PROJECT_UPDATE,
  OrganizationalRisk: PERMISSIONS.RISK_MANAGE,
  MeetingDecision: PERMISSIONS.MEETING_UPDATE,
  GovernanceDecision: PERMISSIONS.GOVERNANCE_MANAGE,
  CrmOrganization: PERMISSIONS.CRM_MANAGE,
  Processus: PERMISSIONS.PROCESS_MANAGE,
  Meeting: PERMISSIONS.MEETING_UPDATE,
};

// Chemin a revalider par type d'entite — meme principe restreint que
// dependency.actions.ts (seuls les types avec une page de detail connue).
const REVALIDATE_PATH: Partial<Record<string, (id: string) => string>> = {
  Project: (id) => `/projets/${id}`,
  Task: (id) => `/taches/${id}`,
  Document: (id) => `/documents/${id}`,
  ProjectRisk: () => `/risques`,
  OrganizationalRisk: (id) => `/risques/${id}`,
  MeetingDecision: () => `/reunions`,
  GovernanceDecision: () => `/gouvernance`,
  CrmOrganization: (id) => `/crm/organisations/${id}`,
  Processus: (id) => `/processus/${id}`,
  Meeting: (id) => `/reunions/${id}`,
};

// Remplace l'ensemble des tags d'une entite en une seule action (plutot que
// attach/detach separes) : cree les tags manquants a la volee (find-or-create
// par nom), puis synchronise les lignes EntityTag par diff.
export async function setEntityTags(input: SetEntityTagsInput) {
  const session = await requireSession();
  const data = setEntityTagsSchema.parse(input);
  requirePermission(session.user.permissions, MANAGE_PERMISSION[data.entityType]);
  const names = Array.from(new Set(data.tagNames.map((n) => n.trim()).filter(Boolean)));

  const tags = await Promise.all(
    names.map((nom) =>
      prisma.tag.upsert({
        where: { nom },
        update: {},
        create: { nom, createdById: session.user.id },
      })
    )
  );

  const existing = await prisma.entityTag.findMany({
    where: { entityType: data.entityType, entityId: data.entityId },
  });
  const existingTagIds = new Set(existing.map((e) => e.tagId));
  const targetTagIds = new Set(tags.map((t) => t.id));

  const toRemove = existing.filter((e) => !targetTagIds.has(e.tagId));
  const toAdd = tags.filter((t) => !existingTagIds.has(t.id));

  await prisma.$transaction([
    ...(toRemove.length > 0 ? [prisma.entityTag.deleteMany({ where: { id: { in: toRemove.map((r) => r.id) } } })] : []),
    ...toAdd.map((t) =>
      prisma.entityTag.create({ data: { tagId: t.id, entityType: data.entityType, entityId: data.entityId } })
    ),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "tags.updated",
    entityType: data.entityType,
    entityId: data.entityId,
    changes: { tags: names },
  });

  const revalidate = REVALIDATE_PATH[data.entityType];
  if (revalidate) revalidatePath(revalidate(data.entityId));
  revalidatePath("/recherche");

  return { tags: tags.map((t) => ({ id: t.id, nom: t.nom, couleur: t.couleur })) };
}
