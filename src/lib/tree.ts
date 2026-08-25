/**
 * Reconstruit une arborescence a partir d'une liste plate portant id/parentId
 * (Problem Tree, Solution Tree — meme principe que HierarchyTree pour
 * ProjectSection, mais factorise ici pour etre reutilise par les deux sans
 * dupliquer la logique de nesting).
 */
export type TreeNode<T> = T & { children: TreeNode<T>[] };

export function buildTree<T extends { id: string; parentId: string | null }>(items: T[]): TreeNode<T>[] {
  const nodeById = new Map<string, TreeNode<T>>();
  for (const item of items) {
    nodeById.set(item.id, { ...item, children: [] });
  }
  const roots: TreeNode<T>[] = [];
  for (const item of items) {
    const node = nodeById.get(item.id)!;
    if (item.parentId && nodeById.has(item.parentId)) {
      nodeById.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
