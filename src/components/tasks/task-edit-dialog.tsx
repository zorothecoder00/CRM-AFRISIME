"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateTask } from "@/actions/task.actions";
import { updateTaskSchema, type UpdateTaskInput } from "@/lib/validations/task.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

export type TaskEditData = {
  id: string;
  titre: string;
  description: string | null;
  priorite: string;
  responsablePrincipalId: string;
  echeance: string | null;
  tempsEstimeHeures: number | null;
};

/** Édition d'une tâche depuis une vue liste (liste/kanban) — dialogue contrôlé, pas de trigger propre. */
export function TaskEditDialog({
  task,
  users,
  open,
  onOpenChange,
  onSuccess,
}: {
  task: TaskEditData;
  users: Option[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: UpdateTaskInput) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      id: task.id,
      titre: task.titre,
      description: task.description ?? "",
      priorite: task.priorite as UpdateTaskInput["priorite"],
      responsablePrincipalId: task.responsablePrincipalId,
      echeance: task.echeance ? task.echeance.slice(0, 10) : "",
      tempsEstimeHeures: task.tempsEstimeHeures !== null ? String(task.tempsEstimeHeures) : "",
    },
  });
  const { run: submit, isPending } = useAction(updateTask, { successMessage: "Tâche modifiée." });

  async function onSubmit(data: UpdateTaskInput) {
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
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-titre">Titre</Label>
            <Input id="edit-titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable principal</Label>
              <Select defaultValue={task.responsablePrincipalId} onValueChange={(v) => setValue("responsablePrincipalId", v)}>
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
                defaultValue={task.priorite}
                onValueChange={(v) => setValue("priorite", v as UpdateTaskInput["priorite"])}
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
              <Label htmlFor="edit-echeance">Échéance</Label>
              <Input id="edit-echeance" type="date" {...register("echeance")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tempsEstimeHeures">Temps estimé (h)</Label>
              <Input id="edit-tempsEstimeHeures" type="number" step="0.5" {...register("tempsEstimeHeures")} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
