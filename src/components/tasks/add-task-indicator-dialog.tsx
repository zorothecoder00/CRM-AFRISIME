"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createTaskIndicator } from "@/actions/project.actions";
import { createTaskIndicatorSchema, type CreateTaskIndicatorInput } from "@/lib/validations/project.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddTaskIndicatorDialog({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskIndicatorInput>({
    resolver: zodResolver(createTaskIndicatorSchema),
    defaultValues: { taskId },
  });
  const { run: submit, isPending } = useAction(createTaskIndicator, { successMessage: "KPI ajouté." });

  async function onSubmit(data: CreateTaskIndicatorInput) {
    const result = await submit({ ...data, taskId });
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un KPI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un KPI de tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valeurCible">Valeur cible</Label>
              <Input id="valeurCible" type="number" step="0.01" {...register("valeurCible")} />
              {errors.valeurCible && <p className="text-sm text-destructive">{errors.valeurCible.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unite">Unité</Label>
              <Input id="unite" placeholder="%, €, unités..." {...register("unite")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
