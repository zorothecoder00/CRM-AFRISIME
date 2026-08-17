"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createScenario } from "@/actions/scenario.actions";
import { createScenarioSchema, type CreateScenarioInput } from "@/lib/validations/scenario.schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

const TYPE_OPTIONS = [
  { value: "EFFECTIF", label: "Variation d'effectifs" },
  { value: "RESSOURCES", label: "Variation de ressources" },
  { value: "PROJETS", label: "Variation du nombre de projets" },
  { value: "NOUVELLE_FILIALE", label: "Ouverture d'une nouvelle filiale" },
  { value: "PERSONNALISE", label: "Personnalisé (plusieurs leviers)" },
];

export function ScenarioFormDialog({ departments }: { departments: Option[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreateScenarioInput["type"]>("EFFECTIF");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateScenarioInput>({
    resolver: zodResolver(createScenarioSchema),
    defaultValues: { type: "EFFECTIF" },
  });
  const { run: submit, isPending } = useAction(createScenario, { successMessage: "Scénario créé." });

  async function onSubmit(data: CreateScenarioInput) {
    const result = await submit(data);
    if (result.ok) {
      // reset({ type: "EFFECTIF" }) seul ne suffit pas : react-hook-form ne
      // reecrit pas la valeur DOM d'un champ non controle deja rempli quand
      // on lui passe undefined — il faut repasser une chaine vide explicite
      // pour chaque champ, sinon la valeur precedente reste visible/soumise
      // a la reouverture du dialogue.
      reset({
        nom: "",
        description: "",
        type: "EFFECTIF",
        deltaEffectifPercent: "",
        deltaRessourcesPercent: "",
        deltaProjetsPercent: "",
        nouvelleFilialeEffectif: "",
        nouvelleFilialeProjets: "",
        departmentId: "",
      });
      setType("EFFECTIF");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau scénario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un scénario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du scénario</Label>
            <Input placeholder="Ex. Ouverture de 3 nouvelles agences" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description (facultatif)</Label>
            <Input {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Type de scénario</Label>
            <Select
              defaultValue="EFFECTIF"
              onValueChange={(v) => {
                const next = v as CreateScenarioInput["type"];
                setType(next);
                setValue("type", next);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "NOUVELLE_FILIALE" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effectif de la filiale</Label>
                <Input type="number" {...register("nouvelleFilialeEffectif")} />
                {errors.nouvelleFilialeEffectif && (
                  <p className="text-sm text-destructive">{errors.nouvelleFilialeEffectif.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Projets de la filiale</Label>
                <Input type="number" {...register("nouvelleFilialeProjets")} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Δ effectifs (%)</Label>
                <Input type="number" placeholder="Ex. 20" {...register("deltaEffectifPercent")} />
              </div>
              <div className="space-y-2">
                <Label>Δ ressources (%)</Label>
                <Input type="number" placeholder="Ex. -15" {...register("deltaRessourcesPercent")} />
              </div>
              <div className="space-y-2">
                <Label>Δ projets (%)</Label>
                <Input type="number" placeholder="Ex. 30" {...register("deltaProjetsPercent")} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Portée (facultatif — vide = organisation entière)</Label>
            <Select onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Organisation entière" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le scénario"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
