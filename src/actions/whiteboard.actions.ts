"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// kind (cahier des charges §X, "Coédition : Notes / Tableaux / Plans") —
// change seulement l'icone/le style de la carte, pas son comportement :
// pas de vraie difference structurelle entre une "table" et une "note"
// dans ce MVP sans moteur de diagramme.
export type WhiteboardNoteKind = "NOTE" | "TABLEAU" | "PLAN";
export type WhiteboardNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  kind?: WhiteboardNoteKind;
};

/**
 * Sauvegarde le tableau blanc d'un projet (cahier des charges §7) — remplace
 * tout le contenu (pas de fusion/sync temps réel entre éditeurs concurrents
 * dans cette version, comme un document partagé classique).
 */
export async function saveWhiteboard(projectId: string, notes: WhiteboardNote[]) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const whiteboard = await prisma.whiteboard.upsert({
    where: { projectId },
    update: { content: notes, updatedById: session.user.id },
    create: { projectId, content: notes, updatedById: session.user.id },
  });

  await logAudit({
    userId: session.user.id,
    action: "whiteboard.saved",
    entityType: "Project",
    entityId: projectId,
    changes: { noteCount: notes.length },
  });

  revalidatePath(`/taches`);
  return whiteboard;
}
