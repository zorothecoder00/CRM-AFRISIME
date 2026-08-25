"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  saveProjectDiagnosticSchema,
  type SaveProjectDiagnosticInput,
} from "@/lib/validations/project-diagnostic.schema";

/** Un seul enregistrement par projet (Project Studio §6) — upsert, pas de create/update séparés. */
export async function saveProjectDiagnostic(input: SaveProjectDiagnosticInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = saveProjectDiagnosticSchema.parse(input);

  const fields = {
    analyseContexte: data.analyseContexte || null,
    analyseBesoins: data.analyseBesoins || null,
    analyseCauses: data.analyseCauses || null,
    analyseConsequences: data.analyseConsequences || null,
    donneesStatistiques: data.donneesStatistiques || null,
    enquetes: data.enquetes || null,
    consultations: data.consultations || null,
    etudesExistantes: data.etudesExistantes || null,
    analyseDocumentaire: data.analyseDocumentaire || null,
  };

  const diagnostic = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectDiagnostic.upsert({
      where: { projectId: data.projectId },
      create: {
        projectId: data.projectId,
        ...fields,
        updatedById: session.user.id,
        organizationId: session.user.organizationId,
      },
      update: {
        ...fields,
        updatedById: session.user.id,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_diagnostic.saved",
    entityType: "ProjectDiagnostic",
    entityId: diagnostic.id,
    changes: { projectId: data.projectId },
  });

  revalidatePath(`/projets/${data.projectId}`);
  return diagnostic;
}
