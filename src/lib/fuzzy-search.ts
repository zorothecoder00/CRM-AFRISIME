import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Recherche floue tolerante aux fautes de frappe (globalSearch,
// src/lib/search.ts) — aucune cle LLM/embeddings disponible dans cette
// instance, donc pas de vraie recherche "par sens", mais pg_trgm
// (similarite trigramme, extension PostgreSQL standard, activee par la
// migration enable_pg_trgm_search) tolere fautes de frappe/variantes sans
// dependance externe. Seuil bas car destine a elargir le rappel (les
// filtres Prisma qui suivent, eux, restent stricts).
const SIMILARITY_THRESHOLD = 0.15;
const CANDIDATE_LIMIT = 30;

/**
 * Retourne les ids d'une table triés par pertinence décroissante
 * (correspondance exacte d'abord, puis similarité trigramme) sur une ou
 * plusieurs colonnes texte. `table`/`columns` sont toujours des
 * identifiants fixes venant du code (jamais dérivés de l'input
 * utilisateur) — seule `query` est liée comme paramètre, donc sûr contre
 * l'injection SQL malgré l'usage de raw SQL (nécessaire : Prisma n'expose
 * pas `similarity()`/pg_trgm via son query builder typé).
 *
 * Utilisation : chercher les ids pertinents ici, puis les repasser dans un
 * `findMany({ where: { id: { in: ids }, ...autresFiltres } })` Prisma
 * classique pour appliquer les filtres avancés existants (statut,
 * département, dates...) sans les dupliquer en SQL brut — voir
 * sortByRelevance ci-dessous pour réappliquer l'ordre de pertinence après
 * ce second appel (le `in` de Prisma ne préserve pas l'ordre).
 */
export async function fuzzyMatchIds(table: string, columns: string[], query: string): Promise<string[]> {
  const colRefs = columns.map((c) => Prisma.raw(`"${c}"`));
  const likeClause = Prisma.join(
    colRefs.map((col) => Prisma.sql`${col} ILIKE ${`%${query}%`}`),
    " OR "
  );
  const similarityClause = Prisma.join(
    colRefs.map((col) => Prisma.sql`similarity(${col}, ${query}) > ${SIMILARITY_THRESHOLD}`),
    " OR "
  );
  const maxSimilarity = Prisma.join(
    colRefs.map((col) => Prisma.sql`similarity(${col}, ${query})`),
    ", "
  );

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM ${Prisma.raw(`"${table}"`)}
    WHERE ${likeClause} OR ${similarityClause}
    ORDER BY GREATEST(${maxSimilarity}) DESC
    LIMIT ${CANDIDATE_LIMIT}
  `;
  return rows.map((r) => r.id);
}

/** Réapplique l'ordre de pertinence de `fuzzyMatchIds` après un `findMany({ where: { id: { in } } })` (qui ne le préserve pas). */
export function sortByRelevance<T extends { id: string }>(rows: T[], orderedIds: string[]): T[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}
