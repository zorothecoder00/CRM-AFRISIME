"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateProject } from "@/actions/project.actions";
import { updateProjectSchema, type UpdateProjectInput } from "@/lib/validations/project.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

export type ProjectEditData = {
  id: string;
  nom: string;
  description: string | null;
  objectif: string | null;
  responsableId: string;
  departmentId: string;
  priorite: string;
  dateDebut: string | null;
  dateFin: string | null;
  budget: number | null;
  localisation: string | null;
};

/** Édition d'un projet depuis une vue liste (table/kanban/liste) — dialogue contrôlé, pas de trigger propre. */
export function ProjectEditDialog({
  project,
  departments,
  users,
  open,
  onOpenChange,
  onSuccess,
}: {
  project: ProjectEditData;
  departments: Option[];
  users: Option[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: UpdateProjectInput) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      nom: project.nom,
      description: project.description ?? "",
      objectif: project.objectif ?? "",
      responsableId: project.responsableId,
      departmentId: project.departmentId,
      priorite: project.priorite as UpdateProjectInput["priorite"],
      dateDebut: project.dateDebut ? project.dateDebut.slice(0, 10) : "",
      dateFin: project.dateFin ? project.dateFin.slice(0, 10) : "",
      budget: project.budget !== null ? String(project.budget) : "",
      localisation: project.localisation ?? "",
    },
  });
  const { run: submit, isPending } = useAction(updateProject, { successMessage: "Projet modifié." });

  async function onSubmit(data: UpdateProjectInput) {
    const result = await submit(data);
    if (result.ok) {
      onSuccess?.(data);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Modifier le projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-nom">Nom</Label>
            <Input id="edit-nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-objectif">Objectif</Label>
            <Textarea id="edit-objectif" {...register("objectif")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select defaultValue={project.responsableId} onValueChange={(v) => setValue("responsableId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.responsableId && <p className="text-sm text-destructive">{errors.responsableId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Département</Label>
              <Select defaultValue={project.departmentId} onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                defaultValue={project.priorite}
                onValueChange={(v) => setValue("priorite", v as UpdateProjectInput["priorite"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASSE">Basse</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="CRITIQUE">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-budget">Budget</Label>
              <Input id="edit-budget" type="number" step="0.01" {...register("budget")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dateDebut">Date de début</Label>
              <Input id="edit-dateDebut" type="date" {...register("dateDebut")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dateFin">Date de fin</Label>
              <Input id="edit-dateFin" type="date" {...register("dateFin")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-localisation">Localisation</Label>
            <Input id="edit-localisation" {...register("localisation")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
