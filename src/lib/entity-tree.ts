export type EntityNode = { id: string; nom: string; parentId: string | null };

/**
 * Niveaux multi-entites (cahier des charges V2.2 §22) : Groupe/Société/
 * Filiale/Agence ne sont pas des types distincts en base — même principe
 * que departmentLevelLabel : la profondeur dans l'arbre Entity (auto-
 * référencé, profondeur illimitée) détermine le libellé.
 */
export function entityLevelLabel(depth: number): string {
  if (depth <= 0) return "Groupe";
  if (depth === 1) return "Société";
  if (depth === 2) return "Filiale";
  return "Agence";
}

export function computeEntityDepth(entityId: string, byId: Map<string, EntityNode>): number {
  let depth = 0;
  let current = byId.get(entityId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = byId.get(current.parentId);
  }
  return depth;
}

/** L'entité elle-même + tous ses descendants (profondeur illimitée). */
export function collectDescendantEntityIds(entityId: string, all: EntityNode[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const e of all) {
    if (!e.parentId) continue;
    const list = childrenByParent.get(e.parentId) ?? [];
    list.push(e.id);
    childrenByParent.set(e.parentId, list);
  }
  const result: string[] = [entityId];
  const queue = [entityId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

export function directChildEntities(entityId: string, all: EntityNode[]): EntityNode[] {
  return all.filter((e) => e.parentId === entityId);
}

/** Fil d'ariane Groupe > Société > ... > noeud courant. */
export function buildEntityBreadcrumb(entityId: string, byId: Map<string, EntityNode>): EntityNode[] {
  const chain: EntityNode[] = [];
  let current = byId.get(entityId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}
