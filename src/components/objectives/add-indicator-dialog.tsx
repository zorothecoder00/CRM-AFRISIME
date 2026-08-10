"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addIndicator } from "@/actions/objective.actions";
import { addIndicatorSchema, type AddIndicatorInput } from "@/lib/validations/objective.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddIndicatorDialog({ objectiveId }: { objectiveId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddIndicatorInput>({
    resolver: zodResolver(addIndicatorSchema),
    defaultValues: { objectiveId },
  });

  async function onSubmit(data: AddIndicatorInput) {
    try {
      await addIndicator({ ...data, objectiveId });
      toast.success("Indicateur ajouté.");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un indicateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un indicateur mesurable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Taux de satisfaction client" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valeurCible">Valeur cible</Label>
              <Input id="valeurCible" type="number" step="0.01" {...register("valeurCible")} />
              {errors.valeurCible && (
                <p className="text-sm text-destructive">{errors.valeurCible.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unite">Unité</Label>
              <Input id="unite" placeholder="%, €, tâches..." {...register("unite")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
