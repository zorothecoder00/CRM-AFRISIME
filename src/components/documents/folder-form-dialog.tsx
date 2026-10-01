"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createFolder, updateFolder } from "@/actions/document.actions";
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

/**
 * Creation d'un dossier (de projet si projectId, sinon de documents libres)
 * ou renommage d'un dossier existant (prop `folder`). En mode renommage,
 * le dialogue est controle par le parent (open/onOpenChange) car il s'ouvre
 * depuis le menu d'actions du dossier, sans bouton declencheur propre.
 */
export function FolderFormDialog({
  projectId,
  parentId,
  folder,
  open: controlledOpen,
  onOpenChange,
  triggerLabel = "Nouveau dossier",
  variant = "outline",
}: {
  projectId?: string;
  parentId?: string;
  folder?: { id: string; nom: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  variant?: "outline" | "default";
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!folder;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFolderInput>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: { projectId, parentId, nom: folder?.nom ?? "" },
  });
  const { run: create, isPending: creating } = useAction(createFolder, { successMessage: "Dossier créé." });
  const { run: rename, isPending: renaming } = useAction(updateFolder, { successMessage: "Dossier renommé." });
  const isPending = creating || renaming;

  async function onSubmit(data: CreateFolderInput) {
    const result = isEdit
      ? await rename({ id: folder.id, nom: data.nom })
      : await create({ ...data, projectId, parentId });
    if (result.ok) {
      reset({ projectId, parentId, nom: isEdit ? data.nom : "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button variant={variant} size="sm">
            <FolderPlus className="mr-1 h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Renommer le dossier" : "Créer un dossier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du dossier</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Renommer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
