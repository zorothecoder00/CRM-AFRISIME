"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProject } from "@/actions/project.actions";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validations/project.schema";
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
import Link from "next/link";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

export function ProjectFormDialog({
  departments,
  users,
  templates = [],
}: {
  departments: Option[];
  users: Option[];
  templates?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { priorite: "MOYENNE" },
  });
  const { run: submit, isPending } = useAction(createProject, {
    successMessage: "Projet créé avec succès.",
  });

  async function onSubmit(data: CreateProjectInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Modèle (facultatif)</Label>
                <Link href="/projets/modeles" className="text-xs text-primary hover:underline">
                  Gérer les modèles →
                </Link>
              </div>
              <Select onValueChange={(v) => setValue("templateId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Partir de zéro" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Génère automatiquement les phases WBS de départ du modèle.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectif">Objectif</Label>
            <Textarea id="objectif" {...register("objectif")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select onValueChange={(v) => setValue("responsableId", v)}>
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
              {errors.responsableId && (
                <p className="text-sm text-destructive">{errors.responsableId.message}</p>
              )}
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                defaultValue="MOYENNE"
                onValueChange={(v) => setValue("priorite", v as CreateProjectInput["priorite"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASSE">Basse</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="CRITIQUE">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" type="number" step="0.01" {...register("budget")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localisation">Localisation</Label>
            <Input id="localisation" placeholder="Ex. Cotonou, Bénin" {...register("localisation")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="any" placeholder="Ex. 6.3703" {...register("latitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" placeholder="Ex. 2.3912" {...register("longitude")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Coordonnées utilisées par la vue Carte — laissez vide si vous ne les connaissez pas.
          </p>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le projet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
