"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createEntity, updateEntity } from "@/actions/entity.actions";
import { createEntitySchema, type CreateEntityInput } from "@/lib/validations/entity.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };
type EntityEdit = {
  id: string;
  nom: string;
  code: string;
  parentId: string | null;
  pays: string | null;
  devise: string | null;
  fuseauHoraire: string | null;
  langue: string | null;
  reglementations: string | null;
  parametresLocaux: string | null;
};

export function EntityFormDialog({
  parentOptions,
  entity,
  defaultParentId,
  triggerLabel,
}: {
  /** Entités éligibles comme parent (déjà indentées par profondeur dans le label). */
  parentOptions: Option[];
  /** Présent = mode édition. Absent = création. */
  entity?: EntityEdit;
  /** Pré-remplit le parent en création (bouton "Ajouter une sous-entité" depuis l'arbre). */
  defaultParentId?: string;
  triggerLabel?: string;
}) {
  const isEdit = !!entity;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEntityInput>({
    resolver: zodResolver(createEntitySchema),
    defaultValues: entity
      ? {
          nom: entity.nom,
          code: entity.code,
          parentId: entity.parentId ?? undefined,
          pays: entity.pays ?? "",
          devise: entity.devise ?? "",
          fuseauHoraire: entity.fuseauHoraire ?? "",
          langue: entity.langue ?? "",
          reglementations: entity.reglementations ?? "",
          parametresLocaux: entity.parametresLocaux ?? "",
        }
      : { parentId: defaultParentId },
  });
  const { run: createRun, isPending: isCreating } = useAction(createEntity, { successMessage: "Entité créée." });
  const { run: updateRun, isPending: isUpdating } = useAction(updateEntity, { successMessage: "Entité mise à jour." });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateEntityInput) {
    const result = isEdit ? await updateRun({ ...data, id: entity.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  // En edition, une entite ne peut pas se prendre elle-meme comme parent —
  // le serveur re-verifie de toute facon (assertNoCycle), simple confort UI.
  const availableParents = isEdit ? parentOptions.filter((p) => p.id !== entity!.id) : parentOptions;

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
            {triggerLabel ?? "Nouvelle entité"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'entité" : "Créer une entité"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex : AfriSime Togo" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="Ex : TG, BJ, CI..." {...register("code")} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Entité parente</Label>
            <Select defaultValue={entity?.parentId ?? defaultParentId} onValueChange={(v) => setValue("parentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucune (niveau Groupe)" />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pays">Pays</Label>
              <Input id="pays" placeholder="Ex : Togo" {...register("pays")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devise">Devise</Label>
              <Input id="devise" placeholder="Ex : XOF" {...register("devise")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fuseauHoraire">Fuseau horaire</Label>
              <Input id="fuseauHoraire" placeholder="Ex : GMT" {...register("fuseauHoraire")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="langue">Langue</Label>
              <Input id="langue" placeholder="Ex : Français" {...register("langue")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reglementations">Réglementations locales</Label>
            <Input id="reglementations" {...register("reglementations")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parametresLocaux">Paramètres locaux</Label>
            <Input id="parametresLocaux" {...register("parametresLocaux")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
