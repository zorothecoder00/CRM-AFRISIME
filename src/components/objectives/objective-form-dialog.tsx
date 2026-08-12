"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createObjective } from "@/actions/objective.actions";
import { createObjectiveSchema, type CreateObjectiveInput } from "@/lib/validations/objective.schema";
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
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

export function ObjectiveFormDialog({
  users,
  projects,
  departments,
  currentUserId,
}: {
  users: Option[];
  projects: Option[];
  departments: Option[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<CreateObjectiveInput["scope"]>("INDIVIDUEL");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateObjectiveInput>({
    resolver: zodResolver(createObjectiveSchema),
    defaultValues: { periode: "MENSUEL", scope: "INDIVIDUEL", userId: currentUserId },
  });
  const { run: submit, isPending } = useAction(createObjective, { successMessage: "Objectif créé." });

  async function onSubmit(data: CreateObjectiveInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setScope("INDIVIDUEL");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel objectif
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un objectif</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Périodicité</Label>
              <Select
                defaultValue="MENSUEL"
                onValueChange={(v) => setValue("periode", v as CreateObjectiveInput["periode"])}
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

            <div className="space-y-2">
              <Label>Portée</Label>
              <Select
                defaultValue="INDIVIDUEL"
                onValueChange={(v) => {
                  const next = v as CreateObjectiveInput["scope"];
                  setScope(next);
                  setValue("scope", next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUEL">Individuel</SelectItem>
                  <SelectItem value="EQUIPE">Équipe (projet)</SelectItem>
                  <SelectItem value="DEPARTEMENT">Département</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === "INDIVIDUEL" && (
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <Select defaultValue={currentUserId} onValueChange={(v) => setValue("userId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
            </div>
          )}

          {scope === "EQUIPE" && (
            <div className="space-y-2">
              <Label>Projet (équipe)</Label>
              <Select onValueChange={(v) => setValue("projectId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId.message}</p>
              )}
            </div>
          )}

          {scope === "DEPARTEMENT" && (
            <div className="space-y-2">
              <Label>Département</Label>
              <Select onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-sm text-destructive">{errors.departmentId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && (
                <p className="text-sm text-destructive">{errors.dateDebut.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && (
                <p className="text-sm text-destructive">{errors.dateFin.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer l'objectif"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
