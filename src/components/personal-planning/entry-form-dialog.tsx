"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createPersonalPlanningEntry } from "@/actions/personal-planning.actions";
import {
  createPersonalPlanningEntrySchema,
  type CreatePersonalPlanningEntryInput,
} from "@/lib/validations/personal-planning.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

/** Création d'une entrée de planning personnel (note ou créneau indisponible), privée par défaut. */
export function PersonalPlanningEntryFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePersonalPlanningEntryInput>({
    resolver: zodResolver(createPersonalPlanningEntrySchema),
    defaultValues: { type: "NOTE" },
  });
  const { run: submit, isPending } = useAction(createPersonalPlanningEntry, { successMessage: "Entrée ajoutée." });

  async function onSubmit(data: CreatePersonalPlanningEntryInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ type: "NOTE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle entrée
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle entrée de planning personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" placeholder="Ex. Rendez-vous médecin" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue="NOTE" onValueChange={(v) => setValue("type", v as CreatePersonalPlanningEntryInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOTE">Note personnelle</SelectItem>
                <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Début</Label>
              <Input id="dateDebut" type="datetime-local" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Fin</Label>
              <Input id="dateFin" type="datetime-local" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel, visibles de vous seul)</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
