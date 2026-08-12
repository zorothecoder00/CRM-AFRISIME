"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createFolder } from "@/actions/document.actions";
import { createFolderSchema, type CreateFolderInput } from "@/lib/validations/document.schema";
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
import { FolderPlus } from "lucide-react";

export function FolderFormDialog({
  projectId,
  parentId,
  triggerLabel = "Nouveau dossier",
  variant = "outline",
}: {
  projectId: string;
  parentId?: string;
  triggerLabel?: string;
  variant?: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFolderInput>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: { projectId, parentId },
  });
  const { run: submit, isPending } = useAction(createFolder, { successMessage: "Dossier créé." });

  async function onSubmit(data: CreateFolderInput) {
    const result = await submit({ ...data, projectId, parentId });
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <FolderPlus className="mr-1 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du dossier</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
