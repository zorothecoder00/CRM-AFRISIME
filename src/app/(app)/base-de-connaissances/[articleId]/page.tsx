import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForArticleStatus, accentForArticleStatus } from "@/lib/status-tone";
import { ArticleFormDialog } from "@/components/knowledge/article-form-dialog";
import { PublishToggleButton } from "@/components/knowledge/publish-toggle-button";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
};

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_READ)) {
    redirect("/dashboard");
  }
  const canModerate = session!.user.permissions.includes(PERMISSIONS.KNOWLEDGE_UPDATE);
  const userId = session!.user.id;

  const [article, categories] = await Promise.all([
    prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
      include: { author: true, category: true },
    }),
    prisma.knowledgeCategory.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  if (!article) {
    notFound();
  }

  const isAuthor = article.authorId === userId;
  if (article.statut === "BROUILLON" && !isAuthor && !canModerate) {
    redirect("/base-de-connaissances");
  }

  const canEdit = isAuthor || canModerate;
  const tags = article.tags
    ? article.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{article.titre}</h1>
            <Badge variant={toneForArticleStatus(article.statut)}>{STATUS_LABELS[article.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Par {article.author.name}
            {article.category && ` — ${article.category.nom}`} · mis à jour le{" "}
            {article.updatedAt.toLocaleDateString("fr-FR")}
          </p>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Card accent={accentForArticleStatus(article.statut)}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contenu</CardTitle>
            {canEdit && (
              <div className="flex items-center gap-1">
                <ArticleFormDialog
                  categories={categories.map((c) => ({ id: c.id, label: c.nom }))}
                  article={{
                    id: article.id,
                    titre: article.titre,
                    content: article.content,
                    tags: article.tags,
                    categoryId: article.categoryId,
                  }}
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{article.content}</p>
          </CardContent>
        </Card>

        {canEdit && <PublishToggleButton articleId={article.id} statut={article.statut} />}
      </div>
    </div>
  );
}
