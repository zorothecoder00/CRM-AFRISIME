export type DepartmentNode = { id: string; name: string; parentId: string | null };

/**
 * Niveaux de pilotage (cahier des charges §XXIII) : Direction/Département/
 * Service ne sont pas des types distincts en base — ce sont simplement la
 * profondeur d'un noeud dans l'arbre Department (déjà self-referencing,
 * profondeur illimitée). Direction = racine (profondeur 0), Département =
 * profondeur 1, Service = profondeur 2 et au-delà.
 */
export function departmentLevelLabel(depth: number): string {
  if (depth <= 0) return "Direction";
  if (depth === 1) return "Département";
  return "Service";
}

export function computeDepartmentDepth(departmentId: string, byId: Map<string, DepartmentNode>): number {
  let depth = 0;
  let current = byId.get(departmentId);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    depth++;
    current = byId.get(current.parentId);
  }
  return depth;
}

/** Le département lui-même + tous ses descendants (profondeur illimitée). */
export function collectDescendantIds(departmentId: string, all: DepartmentNode[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const d of all) {
    if (!d.parentId) continue;
    const list = childrenByParent.get(d.parentId) ?? [];
    list.push(d.id);
    childrenByParent.set(d.parentId, list);
  }
  const result: string[] = [departmentId];
  const queue = [departmentId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      result.push(childId);
      queue.push(childId);
    }
  }
  return result;
}

export function directChildren(departmentId: string, all: DepartmentNode[]): DepartmentNode[] {
  return all.filter((d) => d.parentId === departmentId);
}

/** Fil d'ariane Organisation > Direction > ... > noeud courant. */
export function buildBreadcrumb(departmentId: string, byId: Map<string, DepartmentNode>): DepartmentNode[] {
  const chain: DepartmentNode[] = [];
  let current = byId.get(departmentId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}
