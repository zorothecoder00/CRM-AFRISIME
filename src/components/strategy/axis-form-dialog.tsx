"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAxis, updateAxis } from "@/actions/axis.actions";
import { createAxisSchema, type CreateAxisInput } from "@/lib/validations/axis.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const PRIORITY_LABELS: Record<string, string> = { BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", CRITIQUE: "Critique" };

type AxisEdit = { id: string; nom: string; description: string | null; priorite: CreateAxisInput["priorite"] };

export function AxisFormDialog({ axis }: { axis?: AxisEdit }) {
  const isEdit = !!axis;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAxisInput>({
    resolver: zodResolver(createAxisSchema),
    defaultValues: axis
      ? { nom: axis.nom, description: axis.description ?? undefined, priorite: axis.priorite }
      : { priorite: "MOYENNE" },
  });
  const { run: createRun, isPending: isCreating } = useAction(createAxis, { successMessage: "Axe créé." });
  const { run: updateRun, isPending: isUpdating } = useAction(updateAxis, { successMessage: "Axe mis à jour." });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateAxisInput) {
    const result = isEdit ? await updateRun({ ...data, id: axis.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nouvel axe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'axe" : "Créer un axe stratégique"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Expansion régionale" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select
              defaultValue={axis?.priorite ?? "MOYENNE"}
              onValueChange={(v) => setValue("priorite", v as CreateAxisInput["priorite"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
