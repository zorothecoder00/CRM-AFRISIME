"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateObjective } from "@/actions/objective.actions";
import { updateObjectiveSchema, type UpdateObjectiveInput } from "@/lib/validations/objective.schema";
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
import { Pencil } from "lucide-react";

/** yyyy-MM-dd attendu par <input type="date">, à partir d'une Date ou d'une chaîne ISO. */
function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Modification/réévaluation d'un objectif existant (demande utilisateur) —
 * volontairement limité au contenu et au calendrier (titre, description,
 * périodicité, dates), pas à la portée/scope, décision structurelle prise
 * une fois à la création (voir ObjectiveFormDialog pour ça).
 */
export function ObjectiveEditDialog({
  objective,
}: {
  objective: {
    id: string;
    titre: string;
    description: string | null;
    periode: UpdateObjectiveInput["periode"];
    dateDebut: Date | string;
    dateFin: Date | string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateObjectiveInput>({
    resolver: zodResolver(updateObjectiveSchema),
    defaultValues: {
      objectiveId: objective.id,
      titre: objective.titre,
      description: objective.description ?? undefined,
      periode: objective.periode,
      dateDebut: toDateInputValue(objective.dateDebut),
      dateFin: toDateInputValue(objective.dateFin),
    },
  });
  const { run: submit, isPending } = useAction(updateObjective, { successMessage: "Objectif mis à jour." });

  async function onSubmit(data: UpdateObjectiveInput) {
    const result = await submit(data);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Modifier / réévaluer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;objectif</DialogTitle>
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

          <div className="space-y-2">
            <Label>Périodicité</Label>
            <Select
              defaultValue={objective.periode}
              onValueChange={(v) => setValue("periode", v as UpdateObjectiveInput["periode"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUEL">Annuel</SelectItem>
                <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                <SelectItem value="MENSUEL">Mensuel</SelectItem>
                <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dateDebut">Date de début</Label>
              <Input id="edit-dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dateFin">Date de fin</Label>
              <Input id="edit-dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
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
