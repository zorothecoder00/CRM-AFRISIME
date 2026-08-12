import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryTree, type CategoryNode } from "@/components/knowledge/category-tree";
import { CategoryFormDialog } from "@/components/knowledge/category-form-dialog";
import { ArticleFormDialog } from "@/components/knowledge/article-form-dialog";
import { ArticleList, type ArticleRow } from "@/components/knowledge/article-list";
import Link from "next/link";

function buildCategoryTree(
  categories: { id: string; nom: string; parentId: string | null; _count: { articles: number } }[]
): CategoryNode[] {
  const nodeById = new Map<string, CategoryNode>();
  for (const c of categories) {
    nodeById.set(c.id, {
      id: c.id,
      nom: c.nom,
      parentId: c.parentId,
      articleCount: c._count.articles,
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const c of categories) {
    const node = nodeById.get(c.id)!;
    if (c.parentId && nodeById.has(c.parentId)) {
      nodeById.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function flattenForOptions(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"—".repeat(depth)} ${node.nom}`.trim() },
    ...flattenForOptions(node.children, depth + 1),
  ]);
}

export default async function BaseDeConnaissancesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; q?: string }>;
}) {
  const { categoryId, q } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_READ)) {
    redirect("/dashboard");
  }
  const canCreate = session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_CREATE);
  const canManageCategories = session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_MANAGE_CATEGORIES);
  const canModerate = session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_UPDATE);
  const userId = session!.user.id;

  const categories = await prisma.knowledgeCategory.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { nom: "asc" },
  });
  const tree = buildCategoryTree(categories);
  const categoryOptions = flattenForOptions(tree);

  const andConditions: Prisma.KnowledgeArticleWhereInput[] = [];
  if (categoryId) andConditions.push({ categoryId });
  if (!canModerate) andConditions.push({ OR: [{ statut: "PUBLIE" }, { authorId: userId }] });
  if (q) {
    andConditions.push({
      OR: [
        { titre: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { tags: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const articles = await prisma.knowledgeArticle.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
    include: { author: true, category: true },
    orderBy: { updatedAt: "desc" },
  });

  const rows: ArticleRow[] = articles.map((a) => ({
    id: a.id,
    titre: a.titre,
    tags: a.tags,
    statut: a.statut,
    authorName: a.author.name,
    categoryName: a.category?.nom ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Base de connaissances</h1>
          <p className="text-sm text-muted-foreground">
            Wiki d&apos;entreprise — procédures, guides et bonnes pratiques classés par catégorie.
          </p>
        </div>
        {canCreate && <ArticleFormDialog categories={categoryOptions} defaultCategoryId={categoryId} />}
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/base-de-connaissances">
        {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
        <Input name="q" placeholder="Rechercher un article..." defaultValue={q} className="max-w-sm" />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
        {(categoryId || q) && (
          <Link href="/base-de-connaissances">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Catégories</CardTitle>
            {canManageCategories && <CategoryFormDialog parentOptions={categoryOptions} triggerLabel="Nouvelle" />}
          </CardHeader>
          <CardContent>
            <Link
              href="/base-de-connaissances"
              className={`mb-2 block text-sm ${!categoryId ? "font-semibold" : "hover:underline"}`}
            >
              Tous les articles
            </Link>
            <CategoryTree
              nodes={tree}
              parentOptions={categoryOptions}
              canManage={canManageCategories}
              activeCategoryId={categoryId}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Articles ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ArticleList articles={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
