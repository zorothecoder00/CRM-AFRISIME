"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createDecisionMatrix } from "@/actions/decision-matrix.actions";
import { createDecisionMatrixSchema, type CreateDecisionMatrixInput } from "@/lib/validations/decision-matrix.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function DecisionMatrixFormDialog({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDecisionMatrixInput>({
    resolver: zodResolver(createDecisionMatrixSchema),
    defaultValues: { titre: "", contexte: "", projectId },
  });
  const { run, isPending } = useAction(createDecisionMatrix, { successMessage: "Matrice créée." });

  async function onSubmit(values: CreateDecisionMatrixInput) {
    const result = await run({ ...values, projectId });
    if (result.ok) {
      reset({ titre: "", contexte: "", projectId });
      setOpen(false);
      router.push(`/decisions/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle matrice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle matrice de décision</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} placeholder="ex: Choix du prestataire hébergement" />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="contexte">Contexte (facultatif)</Label>
            <Textarea id="contexte" {...register("contexte")} rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            Créer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
