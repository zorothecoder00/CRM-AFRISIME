import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "@/components/knowledge/category-form-dialog";

export type CategoryNode = {
  id: string;
  nom: string;
  parentId: string | null;
  articleCount: number;
  children: CategoryNode[];
};

type Option = { id: string; label: string };

export function CategoryTree({
  nodes,
  parentOptions,
  canManage,
  activeCategoryId,
  depth = 0,
}: {
  nodes: CategoryNode[];
  parentOptions: Option[];
  canManage: boolean;
  activeCategoryId?: string;
  depth?: number;
}) {
  if (nodes.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">Aucune catégorie pour le moment.</p>
        {canManage && <CategoryFormDialog parentOptions={parentOptions} />}
      </div>
    );
  }

  return (
    <ul className="space-y-1" style={{ marginLeft: depth > 0 ? "1rem" : 0 }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
              activeCategoryId === node.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            <Link href={`/base-de-connaissances?categoryId=${node.id}`} className="min-w-0 flex-1 truncate">
              {node.nom}
            </Link>
            <Badge variant="outline" className="shrink-0 text-xs">
              {node.articleCount}
            </Badge>
            {canManage && (
              <div className="flex shrink-0 items-center gap-0.5">
                <CategoryFormDialog
                  parentOptions={parentOptions}
                  defaultParentId={node.id}
                  triggerLabel="Sous-catégorie"
                />
                <CategoryFormDialog
                  parentOptions={parentOptions}
                  category={{ id: node.id, nom: node.nom, parentId: node.parentId }}
                />
              </div>
            )}
          </div>
          {node.children.length > 0 && (
            <CategoryTree
              nodes={node.children}
              parentOptions={parentOptions}
              canManage={canManage}
              activeCategoryId={activeCategoryId}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
