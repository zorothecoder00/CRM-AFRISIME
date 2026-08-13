"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createPlan, updatePlan } from "@/actions/plan.actions";
import { createPlanSchema, type CreatePlanInput } from "@/lib/validations/plan.schema";
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
type PlanEdit = {
  id: string;
  nom: string;
  niveau: CreatePlanInput["niveau"];
  description: string | null;
  dateDebut: string;
  dateFin: string;
  budgetIndicatif: string | null;
  priorites: string | null;
  axisId: string | null;
  departmentId: string | null;
  parentId: string | null;
  ownerId: string;
};

const NIVEAU_LABELS: Record<string, string> = {
  STRATEGIQUE: "Stratégique",
  ANNUEL: "Annuel",
  TRIMESTRIEL: "Trimestriel",
  MENSUEL: "Mensuel",
};

export function PlanFormDialog({
  departments,
  users,
  axes,
  parentOptions,
  currentUserId,
  plan,
  defaultParentId,
  triggerLabel,
}: {
  departments: Option[];
  users: Option[];
  axes: Option[];
  /** Plans eligibles comme plan parent (deja indentes par profondeur dans le label). */
  parentOptions: Option[];
  currentUserId: string;
  /** Present = mode edition. Absent = creation. */
  plan?: PlanEdit;
  defaultParentId?: string;
  triggerLabel?: string;
}) {
  const isEdit = !!plan;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: plan
      ? {
          nom: plan.nom,
          niveau: plan.niveau,
          description: plan.description ?? undefined,
          dateDebut: plan.dateDebut,
          dateFin: plan.dateFin,
          budgetIndicatif: plan.budgetIndicatif ?? undefined,
          priorites: plan.priorites ?? undefined,
          axisId: plan.axisId ?? undefined,
          departmentId: plan.departmentId ?? undefined,
          parentId: plan.parentId ?? undefined,
          ownerId: plan.ownerId,
        }
      : { niveau: "ANNUEL", ownerId: currentUserId, parentId: defaultParentId },
  });
  const { run: createRun, isPending: isCreating } = useAction(createPlan, { successMessage: "Plan créé." });
  const { run: updateRun, isPending: isUpdating } = useAction(updatePlan, { successMessage: "Plan mis à jour." });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreatePlanInput) {
    const result = isEdit ? await updateRun({ ...data, id: plan.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  const availableParents = isEdit ? parentOptions.filter((p) => p.id !== plan!.id) : parentOptions;

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
            {triggerLabel ?? "Nouveau plan"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le plan" : "Créer un plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex : Plan annuel 2026" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select
                defaultValue={plan?.niveau ?? "ANNUEL"}
                onValueChange={(v) => setValue("niveau", v as CreatePlanInput["niveau"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEAU_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Département</Label>
              <Select
                defaultValue={plan?.departmentId ?? undefined}
                onValueChange={(v) => setValue("departmentId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toute l'organisation" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plan parent</Label>
            <Select
              defaultValue={plan?.parentId ?? defaultParentId}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetIndicatif">Budget indicatif</Label>
              <Input id="budgetIndicatif" type="number" step="0.01" {...register("budgetIndicatif")} />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select defaultValue={plan?.ownerId ?? currentUserId} onValueChange={(v) => setValue("ownerId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Axe stratégique</Label>
            <Select defaultValue={plan?.axisId ?? undefined} onValueChange={(v) => setValue("axisId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                {axes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorites">Priorités (libellé libre)</Label>
            <Textarea id="priorites" placeholder="Une priorité par ligne" {...register("priorites")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le plan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
