"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  generateProjectConceptNoteSchema,
  updateProjectConceptNoteSchema,
  type GenerateProjectConceptNoteInput,
  type UpdateProjectConceptNoteInput,
} from "@/lib/validations/project-concept-note.schema";

/**
 * Génération automatique (Project Studio §5) — pré-remplit la Concept Note
 * à partir des champs déjà saisis sur l'idée ; l'utilisateur affine ensuite
 * via updateProjectConceptNote. Idempotent (renvoie la note existante si
 * déjà générée) plutôt que d'échouer sur la contrainte @unique ideaId, pour
 * que le bouton "Générer" reste sûr à re-cliquer depuis l'UI.
 */
export async function generateProjectConceptNote(input: GenerateProjectConceptNoteInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_CREATE);

  const data = generateProjectConceptNoteSchema.parse(input);

  const note = await withTenantScopedSession(session.user.organizationId, async (tx) => {
    const existing = await tx.projectConceptNote.findUnique({ where: { ideaId: data.ideaId } });
    if (existing) return existing;

    const idea = await tx.projectIdea.findUniqueOrThrow({ where: { id: data.ideaId } });

    return tx.projectConceptNote.create({
      data: {
        ideaId: idea.id,
        titre: idea.titreProvisoire,
        contexte: idea.origine,
        probleme: idea.probleme,
        justification: idea.opportunite,
        beneficiaires: idea.beneficiaires,
        duree: idea.dureeEstimee,
        budgetIndicatif: idea.estimationBudgetaire ?? undefined,
        createdById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "project_concept_note.generated",
    entityType: "ProjectConceptNote",
    entityId: note.id,
    changes: { ideaId: data.ideaId },
  });

  revalidatePath(`/projets/idees/${data.ideaId}`);
  return { ...note, budgetIndicatif: note.budgetIndicatif ? Number(note.budgetIndicatif) : null, financementRecherche: note.financementRecherche ? Number(note.financementRecherche) : null };
}

export async function updateProjectConceptNote(input: UpdateProjectConceptNoteInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = updateProjectConceptNoteSchema.parse(input);

  const note = await withTenantScopedSession(session.user.organizationId, (tx) =>
    tx.projectConceptNote.update({
      where: { id: data.conceptNoteId },
      data: {
        titre: data.titre,
        contexte: data.contexte,
        probleme: data.probleme,
        justification: data.justification,
        objectifs: data.objectifs,
        beneficiaires: data.beneficiaires,
        approche: data.approche,
        resultatsAttendus: data.resultatsAttendus,
        duree: data.duree,
        budgetIndicatif: data.budgetIndicatif ? Number(data.budgetIndicatif) : null,
        partenaires: data.partenaires,
        financementRecherche: data.financementRecherche ? Number(data.financementRecherche) : null,
      },
    })
  );

  await logAudit({
    userId: session.user.id,
    action: "project_concept_note.updated",
    entityType: "ProjectConceptNote",
    entityId: note.id,
    changes: { titre: note.titre },
  });

  revalidatePath(`/projets/idees/${note.ideaId}`);
  return { ...note, budgetIndicatif: note.budgetIndicatif ? Number(note.budgetIndicatif) : null, financementRecherche: note.financementRecherche ? Number(note.financementRecherche) : null };
}
