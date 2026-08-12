"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { addEvaluationCritere } from "@/actions/evaluation.actions";
import { addEvaluationCritereSchema, type AddEvaluationCritereInput } from "@/lib/validations/evaluation.schema";
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
import { Plus } from "lucide-react";

export function AddCritereDialog({ evaluationId }: { evaluationId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddEvaluationCritereInput>({
    resolver: zodResolver(addEvaluationCritereSchema),
    defaultValues: { evaluationId },
  });
  const { run: submit, isPending } = useAction(addEvaluationCritere, { successMessage: "Critère ajouté." });

  async function onSubmit(data: AddEvaluationCritereInput) {
    const result = await submit({ ...data, evaluationId });
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
          Ajouter un critère
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un critère noté</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="libelle">Critère</Label>
            <Input id="libelle" placeholder="Ex. Qualité du travail" {...register("libelle")} />
            {errors.libelle && <p className="text-sm text-destructive">{errors.libelle.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (sur 5)</Label>
            <Input id="note" type="number" step="0.5" min={0} max={5} {...register("note")} />
            {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea id="commentaire" {...register("commentaire")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
