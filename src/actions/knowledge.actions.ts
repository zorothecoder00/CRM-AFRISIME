"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission, hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createKnowledgeCategorySchema,
  updateKnowledgeCategorySchema,
  createArticleSchema,
  updateArticleSchema,
  type CreateKnowledgeCategoryInput,
  type UpdateKnowledgeCategoryInput,
  type CreateArticleInput,
  type UpdateArticleInput,
} from "@/lib/validations/knowledge.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Meme principe que assertNoCycle pour Department/Plan : une categorie ne peut pas devenir sa propre ancetre. */
async function assertNoCycle(categoryId: string, parentId: string) {
  if (parentId === categoryId) {
    throw new Error("Une catégorie ne peut pas être sa propre catégorie parente.");
  }
  let currentId: string | null = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === categoryId) {
      throw new Error("Ce rattachement créerait une boucle dans l'arbre de catégories.");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current: { parentId: string | null } | null = await prisma.knowledgeCategory.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

export async function createCategory(input: CreateKnowledgeCategoryInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_MANAGE_CATEGORIES);
  const data = createKnowledgeCategorySchema.parse(input);

  const category = await prisma.knowledgeCategory.create({
    data: {
      nom: data.nom,
      parentId: data.parentId || undefined,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_category.created",
    entityType: "KnowledgeCategory",
    entityId: category.id,
    changes: { nom: category.nom },
  });

  revalidatePath("/base-de-connaissances");
  return category;
}

export async function updateCategory(input: UpdateKnowledgeCategoryInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_MANAGE_CATEGORIES);
  const data = updateKnowledgeCategorySchema.parse(input);

  if (data.parentId) {
    await assertNoCycle(data.id, data.parentId);
  }

  const category = await prisma.knowledgeCategory.update({
    where: { id: data.id },
    data: { nom: data.nom, parentId: data.parentId || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_category.updated",
    entityType: "KnowledgeCategory",
    entityId: category.id,
    changes: { nom: category.nom },
  });

  revalidatePath("/base-de-connaissances");
  return category;
}

export async function createArticle(input: CreateArticleInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_CREATE);
  const data = createArticleSchema.parse(input);

  const article = await prisma.knowledgeArticle.create({
    data: {
      titre: data.titre,
      content: data.content,
      tags: data.tags || undefined,
      categoryId: data.categoryId || undefined,
      authorId: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_article.created",
    entityType: "KnowledgeArticle",
    entityId: article.id,
    changes: { titre: article.titre },
  });

  revalidatePath("/base-de-connaissances");
  return article;
}

async function assertCanEditArticle(session: Awaited<ReturnType<typeof requireSession>>, articleId: string) {
  const article = await prisma.knowledgeArticle.findUniqueOrThrow({ where: { id: articleId } });
  const isAuthor = article.authorId === session.user.id;
  const canModerate = hasPermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_UPDATE);
  if (!isAuthor && !canModerate) {
    throw new Error("Seul l'auteur ou un modérateur peut modifier cet article.");
  }
  return article;
}

export async function updateArticle(input: UpdateArticleInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_CREATE);
  const data = updateArticleSchema.parse(input);

  await assertCanEditArticle(session, data.id);

  const article = await prisma.knowledgeArticle.update({
    where: { id: data.id },
    data: {
      titre: data.titre,
      content: data.content,
      tags: data.tags || undefined,
      categoryId: data.categoryId || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_article.updated",
    entityType: "KnowledgeArticle",
    entityId: article.id,
    changes: { titre: article.titre },
  });

  revalidatePath(`/base-de-connaissances/${article.id}`);
  revalidatePath("/base-de-connaissances");
  return article;
}

export async function publishArticle(articleId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_CREATE);

  await assertCanEditArticle(session, articleId);

  const article = await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: { statut: "PUBLIE", publishedAt: new Date() },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_article.published",
    entityType: "KnowledgeArticle",
    entityId: article.id,
    changes: {},
  });

  revalidatePath(`/base-de-connaissances/${articleId}`);
  revalidatePath("/base-de-connaissances");
  return article;
}

export async function unpublishArticle(articleId: string) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.KNOWLEDGE_CREATE);

  await assertCanEditArticle(session, articleId);

  const article = await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: { statut: "BROUILLON" },
  });

  await logAudit({
    userId: session.user.id,
    action: "knowledge_article.unpublished",
    entityType: "KnowledgeArticle",
    entityId: article.id,
    changes: {},
  });

  revalidatePath(`/base-de-connaissances/${articleId}`);
  revalidatePath("/base-de-connaissances");
  return article;
}
