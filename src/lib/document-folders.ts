/** "Parent / Enfant" : distingue deux sous-dossiers homonymes dans les listes de choix. */
export function folderPathOptions(folders: { id: string; nom: string; parentId: string | null }[]) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const pathOf = (id: string, seen = new Set<string>()): string => {
    const f = byId.get(id)!;
    if (!f.parentId || !byId.has(f.parentId) || seen.has(f.parentId)) return f.nom;
    seen.add(id);
    return `${pathOf(f.parentId, seen)} / ${f.nom}`;
  };
  return folders.map((f) => ({ id: f.id, label: pathOf(f.id) })).sort((a, b) => a.label.localeCompare(b.label));
}
