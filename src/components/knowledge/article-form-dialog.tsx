"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createArticle, updateArticle } from "@/actions/knowledge.actions";
import { createArticleSchema, type CreateArticleInput } from "@/lib/validations/knowledge.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };
type ArticleEdit = {
  id: string;
  titre: string;
  content: string;
  tags: string | null;
  categoryId: string | null;
};

export function ArticleFormDialog({
  categories,
  article,
  defaultCategoryId,
}: {
  categories: Option[];
  /** Present = mode edition. Absent = creation. */
  article?: ArticleEdit;
  defaultCategoryId?: string;
}) {
  const isEdit = !!article;
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateArticleInput>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: article
      ? {
          titre: article.titre,
          content: article.content,
          tags: article.tags ?? undefined,
          categoryId: article.categoryId ?? undefined,
        }
      : { categoryId: defaultCategoryId },
  });
  const { run: createRun, isPending: isCreating } = useAction(createArticle, {
    successMessage: "Article créé en brouillon.",
  });
  const { run: updateRun, isPending: isUpdating } = useAction(updateArticle, {
    successMessage: "Article mis à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateArticleInput) {
    if (isEdit) {
      const result = await updateRun({ ...data, id: article.id });
      if (result.ok) setOpen(false);
      return;
    }
    const result = await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
      router.push(`/base-de-connaissances/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier" title="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel article
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'article" : "Créer un article"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                defaultValue={article?.categoryId ?? defaultCategoryId}
                onValueChange={(v) => setValue("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input id="tags" placeholder="onboarding, RH, procédure" {...register("tags")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenu</Label>
            <Textarea id="content" rows={12} {...register("content")} />
            {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer l'article"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
