"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createTask } from "@/actions/task.actions";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations/task.schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };
type ProjectWithSections = { id: string; nom: string; sections: Option[] };

export function TaskFormDialog({
  projects,
  users,
}: {
  projects: ProjectWithSections[];
  users: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priorite: "MOYENNE" },
  });

  const sectionsForProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId)?.sections ?? [],
    [projects, selectedProjectId]
  );

  async function onSubmit(data: CreateTaskInput) {
    try {
      await createTask(data);
      toast.success("Tâche créée.");
      reset();
      setSelectedProjectId(undefined);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <Select
              onValueChange={(v) => {
                setSelectedProjectId(v);
                setValue("projectId", v);
                setValue("sectionId", undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          {sectionsForProject.length > 0 && (
            <div className="space-y-2">
              <Label>Phase / Sous-phase / Lot</Label>
              <Select onValueChange={(v) => setValue("sectionId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsForProject.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable principal</Label>
              <Select onValueChange={(v) => setValue("responsablePrincipalId", v)}>
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
              {errors.responsablePrincipalId && (
                <p className="text-sm text-destructive">{errors.responsablePrincipalId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                defaultValue="MOYENNE"
                onValueChange={(v) => setValue("priorite", v as CreateTaskInput["priorite"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRES_HAUTE">Très haute</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="BASSE">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="echeance">Échéance</Label>
              <Input id="echeance" type="date" {...register("echeance")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempsEstimeHeures">Temps estimé (h)</Label>
              <Input id="tempsEstimeHeures" type="number" step="0.5" {...register("tempsEstimeHeures")} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Création..." : "Créer la tâche"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
