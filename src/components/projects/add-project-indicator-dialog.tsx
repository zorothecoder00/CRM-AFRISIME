"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectIndicator } from "@/actions/project.actions";
import { createProjectIndicatorSchema, type CreateProjectIndicatorInput } from "@/lib/validations/project.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const FREQUENCE_LABELS: Record<string, string> = {
  PONCTUELLE: "Ponctuelle",
  MENSUELLE: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  SEMESTRIELLE: "Semestrielle",
  ANNUELLE: "Annuelle",
};

type Option = { id: string; label: string };

export function AddProjectIndicatorDialog({ projectId, users = [] }: { projectId: string; users?: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectIndicatorInput>({
    resolver: zodResolver(createProjectIndicatorSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectIndicator, { successMessage: "KPI ajouté." });

  async function onSubmit(data: CreateProjectIndicatorInput) {
    const result = await submit({ ...data, projectId });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un KPI de projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Taux de satisfaction" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="definition">Définition</Label>
            <Input id="definition" {...register("definition")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formule">Formule de calcul</Label>
            <Input id="formule" placeholder="Ex. Nb bénéficiaires satisfaits / Nb total × 100" {...register("formule")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valeurCible">Valeur cible</Label>
              <Input id="valeurCible" type="number" step="0.01" {...register("valeurCible")} />
              {errors.valeurCible && <p className="text-sm text-destructive">{errors.valeurCible.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unite">Unité</Label>
              <Input id="unite" placeholder="%, €, tâches..." {...register("unite")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseline">Baseline</Label>
            <Input id="baseline" type="number" step="0.01" {...register("baseline")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" placeholder="Ex. Enquête bénéficiaires, rapport terrain..." {...register("source")} />
          </div>
          <div className="space-y-2">
            <Label>Fréquence de collecte</Label>
            <Select onValueChange={(v) => setValue("frequence", v as CreateProjectIndicatorInput["frequence"])}>
              <SelectTrigger>
                <SelectValue placeholder="Non définie" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {users.length > 0 && (
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select onValueChange={(v) => setValue("responsableId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="desagregation">Désagrégation éventuelle</Label>
            <Input id="desagregation" placeholder="Ex. Homme/Femme, urbain/rural..." {...register("desagregation")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
