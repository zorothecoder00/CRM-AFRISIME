import { prisma } from "@/lib/prisma";

export type TagRef = { id: string; nom: string; couleur: string | null };

export async function listAllTags(): Promise<TagRef[]> {
  return prisma.tag.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, couleur: true } });
}

export async function getTagsFor(entityType: string, entityId: string): Promise<TagRef[]> {
  const rows = await prisma.entityTag.findMany({
    where: { entityType, entityId },
    include: { tag: true },
  });
  return rows.map((r) => ({ id: r.tag.id, nom: r.tag.nom, couleur: r.tag.couleur }));
}

// Batch : evite un aller-retour par ligne dans les listes (cartes de recherche,
// tableaux) — regroupe les EntityTag par entityId pour un seul entityType.
export async function getTagsForMany(entityType: string, entityIds: string[]): Promise<Map<string, TagRef[]>> {
  if (entityIds.length === 0) return new Map();
  const rows = await prisma.entityTag.findMany({
    where: { entityType, entityId: { in: entityIds } },
    include: { tag: true },
  });
  const map = new Map<string, TagRef[]>();
  for (const r of rows) {
    const arr = map.get(r.entityId) ?? [];
    arr.push({ id: r.tag.id, nom: r.tag.nom, couleur: r.tag.couleur });
    map.set(r.entityId, arr);
  }
  return map;
}

// Resout les (entityType, entityId) portant au moins un des tags donnes
// (par nom) — utilise par la recherche universelle (§28).
export async function findEntitiesByTagNames(tagNames: string[]): Promise<{ entityType: string; entityId: string }[]> {
  if (tagNames.length === 0) return [];
  const rows = await prisma.entityTag.findMany({
    where: { tag: { nom: { in: tagNames, mode: "insensitive" } } },
    select: { entityType: true, entityId: true },
    distinct: ["entityType", "entityId"],
  });
  return rows;
}
