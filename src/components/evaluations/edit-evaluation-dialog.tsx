"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateEvaluation } from "@/actions/evaluation.actions";
import { updateEvaluationSchema, type UpdateEvaluationInput } from "@/lib/validations/evaluation.schema";
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
import { Pencil } from "lucide-react";

type EvaluationEdit = {
  id: string;
  dateDebut: string;
  dateFin: string;
  pointsForts: string | null;
  axesAmelioration: string | null;
  commentaireEvaluateur: string | null;
};

export function EditEvaluationDialog({ evaluation }: { evaluation: EvaluationEdit }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateEvaluationInput>({
    resolver: zodResolver(updateEvaluationSchema),
    defaultValues: {
      id: evaluation.id,
      dateDebut: evaluation.dateDebut,
      dateFin: evaluation.dateFin,
      pointsForts: evaluation.pointsForts ?? undefined,
      axesAmelioration: evaluation.axesAmelioration ?? undefined,
      commentaireEvaluateur: evaluation.commentaireEvaluateur ?? undefined,
    },
  });
  const { run: submit, isPending } = useAction(updateEvaluation, { successMessage: "Évaluation mise à jour." });

  async function onSubmit(data: UpdateEvaluationInput) {
    const result = await submit(data);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier" title="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;évaluation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Début de la période</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Fin de la période</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsForts">Points forts</Label>
            <Textarea id="pointsForts" {...register("pointsForts")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="axesAmelioration">Axes d&apos;amélioration</Label>
            <Textarea id="axesAmelioration" {...register("axesAmelioration")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaireEvaluateur">Commentaire général</Label>
            <Textarea id="commentaireEvaluateur" {...register("commentaireEvaluateur")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
