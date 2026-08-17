"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createDepartment, updateDepartment } from "@/actions/department.actions";
import {
  createDepartmentSchema,
  type CreateDepartmentInput,
} from "@/lib/validations/department.schema";
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
type DepartmentEdit = { id: string; name: string; code: string; parentId: string | null; entityId?: string | null };

export function DepartmentFormDialog({
  parentOptions,
  entities,
  department,
  defaultParentId,
  triggerLabel,
}: {
  /** Departements eligibles comme parent (deja indentes par profondeur dans le label). */
  parentOptions: Option[];
  /** Entites disponibles pour le rattachement (uniquement affiche pour un departement racine). */
  entities?: Option[];
  /** Present = mode edition (renommer, recoder, reparenter). Absent = creation. */
  department?: DepartmentEdit;
  /** Pre-remplit le parent en creation (bouton "Ajouter un sous-departement" depuis l'arbre). */
  defaultParentId?: string;
  triggerLabel?: string;
}) {
  const isEdit = !!department;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: department
      ? {
          name: department.name,
          code: department.code,
          parentId: department.parentId ?? undefined,
          entityId: department.entityId ?? undefined,
        }
      : { parentId: defaultParentId },
  });
  const currentParentId = watch("parentId");
  const { run: createRun, isPending: isCreating } = useAction(createDepartment, {
    successMessage: "Département créé.",
  });
  const { run: updateRun, isPending: isUpdating } = useAction(updateDepartment, {
    successMessage: "Département mis à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateDepartmentInput) {
    const result = isEdit ? await updateRun({ ...data, id: department.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  // En edition, un departement ne peut pas se prendre lui-meme (ou un de ses
  // descendants deja presents dans la liste indentee) comme parent — le
  // serveur re-verifie de toute facon (assertNoCycle), ceci n'est qu'un
  // filtrage de confort cote UI.
  const availableParents = isEdit ? parentOptions.filter((p) => p.id !== department!.id) : parentOptions;

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
            {triggerLabel ?? "Nouveau département"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le département" : "Créer un département"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="Ex : IT, COM, RH..." {...register("code")} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Département parent</Label>
            <Select
              defaultValue={department?.parentId ?? defaultParentId}
              onValueChange={(v) => setValue("parentId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun (niveau racine)" />
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

          {!currentParentId && entities && entities.length > 0 && (
            <div className="space-y-2">
              <Label>Entité de rattachement (cahier des charges §22)</Label>
              <Select defaultValue={department?.entityId ?? undefined} onValueChange={(v) => setValue("entityId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Uniquement pour un département racine — détermine le périmètre de consolidation/isolation.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
