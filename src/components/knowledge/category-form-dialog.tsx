"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createCategory, updateCategory } from "@/actions/knowledge.actions";
import {
  createKnowledgeCategorySchema,
  type CreateKnowledgeCategoryInput,
} from "@/lib/validations/knowledge.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
type CategoryEdit = { id: string; nom: string; parentId: string | null };

export function CategoryFormDialog({
  parentOptions,
  category,
  defaultParentId,
  triggerLabel,
}: {
  /** Toutes les categories, en options indentees — pour le select "parent". */
  parentOptions: Option[];
  /** Present = mode edition. Absent = creation. */
  category?: CategoryEdit;
  defaultParentId?: string;
  triggerLabel?: string;
}) {
  const isEdit = !!category;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateKnowledgeCategoryInput>({
    resolver: zodResolver(createKnowledgeCategorySchema),
    defaultValues: category
      ? { nom: category.nom, parentId: category.parentId ?? undefined }
      : { parentId: defaultParentId },
  });
  const { run: createRun, isPending: isCreating } = useAction(createCategory, {
    successMessage: "Catégorie créée.",
  });
  const { run: updateRun, isPending: isUpdating } = useAction(updateCategory, {
    successMessage: "Catégorie mise à jour.",
  });
  const isPending = isCreating || isUpdating;

  const availableParents = isEdit ? parentOptions.filter((p) => p.id !== category!.id) : parentOptions;

  async function onSubmit(data: CreateKnowledgeCategoryInput) {
    const result = isEdit ? await updateRun({ ...data, id: category.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
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
          <Button variant={defaultParentId ? "outline" : "default"} size={defaultParentId ? "sm" : "default"}>
            <Plus className={defaultParentId ? "mr-1 h-3 w-3" : "mr-2 h-4 w-4"} />
            {triggerLabel ?? "Nouvelle catégorie"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la catégorie" : "Créer une catégorie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Catégorie parente</Label>
            <Select
              defaultValue={category?.parentId ?? defaultParentId}
              onValueChange={(v) => setValue("parentId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune (niveau racine)" />
              </SelectTrigger>
              <SelectContent>
                {availableParents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
