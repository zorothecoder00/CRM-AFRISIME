"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectIdea } from "@/actions/project-idea.actions";
import { createProjectIdeaSchema, type CreateProjectIdeaInput } from "@/lib/validations/project-idea.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

const PRIORITY_LABELS: Record<string, string> = { BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", CRITIQUE: "Critique" };

export function ProjectIdeaFormDialog({ users, departments }: { users: Option[]; departments: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectIdeaInput>({
    resolver: zodResolver(createProjectIdeaSchema),
    defaultValues: { priorite: "MOYENNE" },
  });
  const { run: submit, isPending } = useAction(createProjectIdea, { successMessage: "Idée enregistrée." });

  async function onSubmit(data: CreateProjectIdeaInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ priorite: "MOYENNE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle idée
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle idée de projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titreProvisoire">Titre provisoire</Label>
            <Input id="titreProvisoire" placeholder="Ex. Plateforme de suivi des bénéficiaires" {...register("titreProvisoire")} />
            {errors.titreProvisoire && <p className="text-sm text-destructive">{errors.titreProvisoire.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="origine">Origine de l&apos;idée</Label>
            <Input id="origine" placeholder="Ex. Retour terrain, appel à propositions..." {...register("origine")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="probleme">Problème identifié</Label>
            <Textarea id="probleme" {...register("probleme")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opportunite">Opportunité</Label>
            <Textarea id="opportunite" {...register("opportunite")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="beneficiaires">Bénéficiaires</Label>
              <Input id="beneficiaires" {...register("beneficiaires")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Input id="zone" placeholder="Ex. Région de Dakar" {...register("zone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Porteur</Label>
              <Select onValueChange={(v) => setValue("porteurId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Non désigné" />
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
            <div className="space-y-2">
              <Label>Département</Label>
              <Select onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Non défini" />
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="estimationBudgetaire">Estimation budgétaire</Label>
              <Input id="estimationBudgetaire" type="number" step="0.01" {...register("estimationBudgetaire")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dureeEstimee">Durée estimée</Label>
              <Input id="dureeEstimee" placeholder="Ex. 6 mois" {...register("dureeEstimee")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select defaultValue="MOYENNE" onValueChange={(v) => setValue("priorite", v as CreateProjectIdeaInput["priorite"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceFinancementPotentielle">Source potentielle de financement</Label>
            <Input id="sourceFinancementPotentielle" {...register("sourceFinancementPotentielle")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer l'idée"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
