"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createEntitySchema,
  updateEntitySchema,
  createHolidaySchema,
  type CreateEntityInput,
  type UpdateEntityInput,
  type CreateHolidayInput,
} from "@/lib/validations/entity.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Une entité ne peut pas devenir son propre ancêtre (mirroir de assertNoCycle sur Department). */
async function assertNoCycle(entityId: string, parentId: string) {
  if (parentId === entityId) {
    throw new Error("Une entité ne peut pas être son propre parent.");
  }
  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === entityId) {
      throw new Error("Ce rattachement créerait une boucle dans la hiérarchie.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.entity.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createEntity(input: CreateEntityInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);
  const data = createEntitySchema.parse(input);

  const entity = await prisma.entity.create({
    data: {
      nom: data.nom,
      code: data.code,
      parentId: data.parentId || undefined,
      pays: data.pays || undefined,
      devise: data.devise || undefined,
      fuseauHoraire: data.fuseauHoraire || undefined,
      langue: data.langue || undefined,
      reglementations: data.reglementations || undefined,
      parametresLocaux: data.parametresLocaux || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "entity.created",
    entityType: "Entity",
    entityId: entity.id,
    changes: { nom: entity.nom, parentId: entity.parentId },
  });

  revalidatePath("/administration/entites");
  return { id: entity.id };
}

export async function updateEntity(input: UpdateEntityInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);
  const data = updateEntitySchema.parse(input);

  if (data.parentId) {
    await assertNoCycle(data.id, data.parentId);
  }

  const entity = await prisma.entity.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      code: data.code,
      parentId: data.parentId || null,
      pays: data.pays || null,
      devise: data.devise || null,
      fuseauHoraire: data.fuseauHoraire || null,
      langue: data.langue || null,
      reglementations: data.reglementations || null,
      parametresLocaux: data.parametresLocaux || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "entity.updated",
    entityType: "Entity",
    entityId: entity.id,
    changes: { nom: entity.nom, parentId: entity.parentId },
  });

  revalidatePath("/administration/entites");
  return { id: entity.id };
}

export async function createHoliday(input: CreateHolidayInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);
  const data = createHolidaySchema.parse(input);

  const holiday = await prisma.holiday.create({
    data: {
      entityId: data.entityId,
      nom: data.nom,
      date: new Date(data.date),
      recurrenceAnnuelle: data.recurrenceAnnuelle,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "holiday.created",
    entityType: "Holiday",
    entityId: holiday.id,
    changes: { nom: holiday.nom, entityId: data.entityId },
  });

  revalidatePath("/administration/entites");
  return { id: holiday.id };
}

export async function deleteHoliday(holidayId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.ENTITY_MANAGE);

  await prisma.holiday.delete({ where: { id: holidayId } });

  await logAudit({
    userId: session.user.id,
    action: "holiday.deleted",
    entityType: "Holiday",
    entityId: holidayId,
    changes: {},
  });

  revalidatePath("/administration/entites");
}
