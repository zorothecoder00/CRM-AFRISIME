"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateIndicatorValue, updateIndicatorDetails } from "@/actions/objective.actions";
import { updateIndicatorDetailsSchema, type UpdateIndicatorDetailsInput } from "@/lib/validations/objective.schema";
import { indicatorProgress } from "@/lib/objective-progress";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";

type Option = { id: string; label: string };

export type IndicatorData = {
  id: string;
  nom: string;
  unite: string | null;
  valeurCible: number;
  valeurActuelle: number;
  // Project Studio §49 (Indicator Management) — optionnels : les
  // indicateurs crees avant §49 (ou hors contexte Projet) n'en ont pas.
  definition?: string | null;
  formule?: string | null;
  baseline?: number | null;
  source?: string | null;
  frequence?: string | null;
  responsableId?: string | null;
  responsableName?: string | null;
  desagregation?: string | null;
};

const FREQUENCE_LABELS: Record<string, string> = {
  PONCTUELLE: "Ponctuelle",
  MENSUELLE: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  SEMESTRIELLE: "Semestrielle",
  ANNUELLE: "Annuelle",
};

function IndicatorRow({ indicator, users }: { indicator: IndicatorData; users: Option[] }) {
  const [value, setValue] = useState(String(indicator.valeurActuelle));
  const { run, isPending } = useAction(updateIndicatorValue, { successMessage: "Résultat clé mis à jour." });
  const progress = indicatorProgress(Number(value) || 0, indicator.valeurCible);

  async function handleSave() {
    await run({ indicatorId: indicator.id, valeurActuelle: value });
  }

  const meta: string[] = [];
  if (indicator.baseline !== null && indicator.baseline !== undefined) meta.push(`Baseline : ${indicator.baseline}`);
  if (indicator.frequence) meta.push(FREQUENCE_LABELS[indicator.frequence] ?? indicator.frequence);
  if (indicator.source) meta.push(`Source : ${indicator.source}`);
  if (indicator.responsableName) meta.push(`Responsable : ${indicator.responsableName}`);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{indicator.nom}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {value} / {indicator.valeurCible} {indicator.unite ?? ""} ({progress}%)
          </span>
          <IndicatorEditDialog indicator={indicator} users={users} />
        </div>
      </div>
      {indicator.definition && <p className="mt-1 text-xs text-muted-foreground">{indicator.definition}</p>}
      <ProgressBar value={progress} className="mt-2" />
      {meta.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>}
      {indicator.desagregation && (
        <p className="mt-1 text-xs text-muted-foreground">Désagrégation : {indicator.desagregation}</p>
      )}
      <div className="mt-2 flex gap-2">
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8"
        />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
          Mettre à jour
        </Button>
      </div>
    </div>
  );
}

function IndicatorEditDialog({ indicator, users }: { indicator: IndicatorData; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateIndicatorDetailsInput>({
    resolver: zodResolver(updateIndicatorDetailsSchema),
    defaultValues: {
      indicatorId: indicator.id,
      nom: indicator.nom,
      unite: indicator.unite ?? "",
      valeurCible: String(indicator.valeurCible),
      definition: indicator.definition ?? "",
      formule: indicator.formule ?? "",
      baseline: indicator.baseline !== null && indicator.baseline !== undefined ? String(indicator.baseline) : "",
      source: indicator.source ?? "",
      frequence: (indicator.frequence as UpdateIndicatorDetailsInput["frequence"]) ?? undefined,
      responsableId: indicator.responsableId ?? undefined,
      desagregation: indicator.desagregation ?? "",
    },
  });
  const { run: submit, isPending } = useAction(updateIndicatorDetails, { successMessage: "Indicateur mis à jour." });

  async function onSubmit(data: UpdateIndicatorDetailsInput) {
    const result = await submit(data);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier l'indicateur">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;indicateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-ind-nom">Nom</Label>
            <Input id="edit-ind-nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ind-definition">Définition</Label>
            <Input id="edit-ind-definition" {...register("definition")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ind-formule">Formule de calcul</Label>
            <Input id="edit-ind-formule" placeholder="Ex. Nb bénéficiaires satisfaits / Nb total × 100" {...register("formule")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ind-unite">Unité</Label>
              <Input id="edit-ind-unite" {...register("unite")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ind-baseline">Baseline</Label>
              <Input id="edit-ind-baseline" type="number" step="0.01" {...register("baseline")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ind-cible">Valeur cible</Label>
            <Input id="edit-ind-cible" type="number" step="0.01" {...register("valeurCible")} />
            {errors.valeurCible && <p className="text-sm text-destructive">{errors.valeurCible.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ind-source">Source</Label>
            <Input id="edit-ind-source" placeholder="Ex. Enquête bénéficiaires, rapport terrain..." {...register("source")} />
          </div>
          <div className="space-y-2">
            <Label>Fréquence de collecte</Label>
            <Select
              defaultValue={indicator.frequence ?? undefined}
              onValueChange={(v) => setValue("frequence", v as UpdateIndicatorDetailsInput["frequence"])}
            >
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
              <Select defaultValue={indicator.responsableId ?? undefined} onValueChange={(v) => setValue("responsableId", v)}>
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
            <Label htmlFor="edit-ind-desagregation">Désagrégation éventuelle</Label>
            <Input id="edit-ind-desagregation" placeholder="Ex. Homme/Femme, urbain/rural..." {...register("desagregation")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IndicatorList({ indicators, users = [] }: { indicators: IndicatorData[]; users?: Option[] }) {
  if (indicators.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun résultat clé pour le moment.</p>;
  }

  return (
    <div className="space-y-3">
      {indicators.map((indicator) => (
        <IndicatorRow key={indicator.id} indicator={indicator} users={users} />
      ))}
    </div>
  );
}
