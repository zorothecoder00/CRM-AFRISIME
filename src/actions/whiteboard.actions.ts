"use server";

import { z } from "zod";
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

// Revue de robustesse (2026-09-11) — `notes` n'était vérifié qu'au typage
// TypeScript (disparaît à la frontière Server Action), et rien ne plafonnait
// la taille du contenu JSON stocké. Limite pragmatique plutôt qu'un vrai
// quota métier : évite l'abus, pas pensée pour contraindre un usage normal.
const WHITEBOARD_MAX_NOTES = 500;
const WHITEBOARD_MAX_JSON_LENGTH = 500_000;

const whiteboardNoteSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  color: z.string(),
  kind: z.enum(["NOTE", "TABLEAU", "PLAN"]).optional(),
});

const saveWhiteboardSchema = z
  .array(whiteboardNoteSchema)
  .max(WHITEBOARD_MAX_NOTES, "Tableau blanc trop volumineux (trop d'éléments).");

/**
 * Sauvegarde le tableau blanc d'un projet (cahier des charges §7) — remplace
 * tout le contenu (pas de fusion/sync temps réel entre éditeurs concurrents
 * dans cette version, comme un document partagé classique).
 */
export async function saveWhiteboard(projectId: string, notes: WhiteboardNote[]) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  requirePermission(session.user.permissions, PERMISSIONS.PROJECT_UPDATE);

  const data = saveWhiteboardSchema.parse(notes);
  if (JSON.stringify(data).length > WHITEBOARD_MAX_JSON_LENGTH) {
    throw new Error("Tableau blanc trop volumineux.");
  }

  const whiteboard = await prisma.whiteboard.upsert({
    where: { projectId },
    update: { content: data, updatedById: session.user.id },
    create: { projectId, content: data, updatedById: session.user.id },
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
