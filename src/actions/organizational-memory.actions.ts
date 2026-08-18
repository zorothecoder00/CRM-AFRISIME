"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { searchOrganizationalMemory } from "@/lib/organizational-memory";
import { createMemoryEntrySchema, type CreateMemoryEntryInput } from "@/lib/validations/organizational-memory.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** AI Memory Organisationnelle (cahier des charges V3.0 §17) — recherche par mots-clés sur l'archive institutionnelle. */
export async function queryOrganizationalMemory(query: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEMORY_READ);

  return searchOrganizationalMemory(query);
}

/** Organizational Memory (cahier des charges V3.0 §18) — entrée manuelle (succès/échec/expérience/incident/recommandation…) sans entité dédiée. */
export async function createMemoryEntry(input: CreateMemoryEntryInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.MEMORY_MANAGE);
  const data = createMemoryEntrySchema.parse(input);

  const entry = await prisma.organizationalMemoryEntry.create({
    data: {
      type: data.type,
      titre: data.titre,
      contenu: data.contenu,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "organizational_memory.entry_created",
    entityType: "OrganizationalMemoryEntry",
    entityId: entry.id,
    changes: { type: entry.type, titre: entry.titre },
  });

  revalidatePath("/memoire-organisationnelle");
  return { id: entry.id };
}
