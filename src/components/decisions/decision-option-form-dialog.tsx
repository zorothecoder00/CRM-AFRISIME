"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createDecisionOption } from "@/actions/decision-matrix.actions";
import { createDecisionOptionSchema, type CreateDecisionOptionInput } from "@/lib/validations/decision-matrix.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const NIVEAU_OPTIONS = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYEN", label: "Moyen" },
  { value: "ELEVE", label: "Élevé" },
];

export function DecisionOptionFormDialog({ matrixId }: { matrixId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateDecisionOptionInput>({
    resolver: zodResolver(createDecisionOptionSchema),
    defaultValues: { matrixId, nom: "", risque: "MOYEN", impact: "MOYEN", faisabilite: "MOYEN" },
  });
  const { run, isPending } = useAction(createDecisionOption, { successMessage: "Option ajoutée." });

  async function onSubmit(values: CreateDecisionOptionInput) {
    const result = await run({ ...values, matrixId });
    if (result.ok) {
      reset({ matrixId, nom: "", risque: "MOYEN", impact: "MOYEN", faisabilite: "MOYEN" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter une option
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle option</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nom">Nom de l&apos;option</Label>
            <Input id="nom" {...register("nom")} placeholder="ex: Prestataire A" />
            {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cout">Coût</Label>
              <Input id="cout" type="number" step="0.01" {...register("cout")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delaiJours">Délai (jours)</Label>
              <Input id="delaiJours" type="number" {...register("delaiJours")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ressources">Ressources</Label>
              <Input id="ressources" type="number" step="0.01" {...register("ressources")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="roiPercent">ROI (%)</Label>
              <Input id="roiPercent" type="number" step="0.01" {...register("roiPercent")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Risque</Label>
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("risque", v as CreateDecisionOptionInput["risque"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEAU_OPTIONS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Impact</Label>
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("impact", v as CreateDecisionOptionInput["impact"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEAU_OPTIONS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Faisabilité</Label>
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("faisabilite", v as CreateDecisionOptionInput["faisabilite"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NIVEAU_OPTIONS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            Ajouter
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
