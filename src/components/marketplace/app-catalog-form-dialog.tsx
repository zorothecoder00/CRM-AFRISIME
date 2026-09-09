"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAppCatalogEntry, updateAppCatalogEntry } from "@/actions/app-catalog.actions";
import {
  createAppCatalogEntrySchema,
  type CreateAppCatalogEntryInput,
} from "@/lib/validations/app-catalog.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  RH: "RH",
  JURIDIQUE: "Juridique",
  ONG: "ONG",
  BTP: "BTP",
  CABINET_CONSEIL: "Cabinet conseil",
  INCUBATEUR: "Incubateur",
  FORMATION: "Formation",
  GESTION_ASSOCIATIVE: "Gestion associative",
  GESTION_PROGRAMMES: "Gestion de programmes",
  GESTION_PROJETS_FINANCES: "Gestion de projets financés",
};

type EntryEdit = {
  id: string;
  nom: string;
  categorie: string;
  description: string | null;
  casUsage: string | null;
};

/** Creation/edition d'une entree du catalogue marketplace (demande utilisateur — CRUD complet, jusque-la seul le statut etait editable). */
export function AppCatalogFormDialog({ entry }: { entry?: EntryEdit }) {
  const isEdit = !!entry;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAppCatalogEntryInput>({
    resolver: zodResolver(createAppCatalogEntrySchema),
    defaultValues: entry
      ? {
          nom: entry.nom,
          categorie: entry.categorie as CreateAppCatalogEntryInput["categorie"],
          description: entry.description ?? undefined,
          casUsage: entry.casUsage ?? undefined,
        }
      : undefined,
  });

  const { run: createRun, isPending: isCreating } = useAction(createAppCatalogEntry, {
    successMessage: "Application ajoutée au catalogue.",
  });
  const { run: updateRun, isPending: isUpdating } = useAction(updateAppCatalogEntry, {
    successMessage: "Application mise à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateAppCatalogEntryInput) {
    const result = isEdit ? await updateRun({ ...data, id: entry.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier" title="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nouvelle app
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'application" : "Ajouter une application au catalogue"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              defaultValue={entry?.categorie}
              onValueChange={(v) => setValue("categorie", v as CreateAppCatalogEntryInput["categorie"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categorie && <p className="text-sm text-destructive">{errors.categorie.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description courte</Label>
            <Input id="description" placeholder="Une phrase, affichée sur la carte." {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="casUsage">Cas d&apos;usage</Label>
            <Textarea
              id="casUsage"
              placeholder="Pour qui, pour quel usage concret — détaillé, affiché sur la fiche."
              rows={4}
              {...register("casUsage")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
