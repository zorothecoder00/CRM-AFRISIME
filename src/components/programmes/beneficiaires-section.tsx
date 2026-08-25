"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createBeneficiaire, updateBeneficiaire, deleteBeneficiaire } from "@/actions/portal.actions";
import {
  createBeneficiaireSchema,
  updateBeneficiaireSchema,
  type CreateBeneficiaireInput,
  type UpdateBeneficiaireInput,
} from "@/lib/validations/portal.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Users as UsersIcon } from "lucide-react";

const TYPE_LABELS: Record<string, string> = { DIRECT: "Direct", INDIRECT: "Indirect" };

export type BeneficiaireRow = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  nombre: number | null;
  caracteristiques: string | null;
  localisation: string | null;
  besoins: string | null;
  vulnerabilites: string | null;
  criteresSelection: string | null;
};

/** Fiche bénéficiaires (cahier des charges §20, enrichie Project Studio §10). */
export function BeneficiairesSection({
  programmeId,
  projectId,
  beneficiaires,
  canManage,
}: {
  programmeId?: string;
  projectId?: string;
  beneficiaires: BeneficiaireRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteBeneficiaire, { successMessage: "Bénéficiaire supprimé." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Personnes ou structures bénéficiant de ce programme/projet.</p>
        {canManage && <BeneficiaireFormDialog programmeId={programmeId} projectId={projectId} />}
      </div>

      {beneficiaires.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun bénéficiaire enregistré.</p>
      ) : (
        <div className="space-y-2">
          {beneficiaires.map((b) => (
            <Card key={b.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{b.nom}</div>
                      {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <BeneficiaireFormDialog beneficiaire={b} />
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(b.id)} aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{TYPE_LABELS[b.type]}</Badge>
                  {b.nombre !== null && <Badge variant="outline">{b.nombre} personne(s)</Badge>}
                  {b.localisation && <span className="text-muted-foreground">Localisation : {b.localisation}</span>}
                </div>
                {b.caracteristiques && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Caractéristiques :</span> {b.caracteristiques}
                  </p>
                )}
                {b.besoins && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Besoins :</span> {b.besoins}
                  </p>
                )}
                {b.vulnerabilites && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Vulnérabilités :</span> {b.vulnerabilites}
                  </p>
                )}
                {b.criteresSelection && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Critères de sélection :</span> {b.criteresSelection}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BeneficiaireFormDialog({
  programmeId,
  projectId,
  beneficiaire,
}: {
  programmeId?: string;
  projectId?: string;
  beneficiaire?: BeneficiaireRow;
}) {
  const isEdit = !!beneficiaire;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateBeneficiaireInput>({
    resolver: zodResolver(isEdit ? updateBeneficiaireSchema : createBeneficiaireSchema),
    defaultValues: beneficiaire
      ? {
          nom: beneficiaire.nom,
          description: beneficiaire.description ?? "",
          type: beneficiaire.type as CreateBeneficiaireInput["type"],
          nombre: beneficiaire.nombre !== null ? String(beneficiaire.nombre) : "",
          caracteristiques: beneficiaire.caracteristiques ?? "",
          localisation: beneficiaire.localisation ?? "",
          besoins: beneficiaire.besoins ?? "",
          vulnerabilites: beneficiaire.vulnerabilites ?? "",
          criteresSelection: beneficiaire.criteresSelection ?? "",
        }
      : { nom: "", description: "", type: "DIRECT", programmeId, projectId },
  });
  const { run: createRun, isPending: isCreating } = useAction(createBeneficiaire, { successMessage: "Bénéficiaire ajouté." });
  const { run: updateRun, isPending: isUpdating } = useAction(updateBeneficiaire, {
    successMessage: "Bénéficiaire mis à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateBeneficiaireInput) {
    const result = isEdit
      ? await updateRun({ ...data, id: beneficiaire.id } as UpdateBeneficiaireInput)
      : await createRun({ ...data, programmeId, projectId });
    if (result.ok) {
      if (!isEdit) reset({ nom: "", description: "", type: "DIRECT", programmeId, projectId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nouveau bénéficiaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le bénéficiaire" : "Ajouter un bénéficiaire"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Coopérative Sème-la-Vie" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue={beneficiaire?.type ?? "DIRECT"}
                onValueChange={(v) => setValue("type", v as CreateBeneficiaireInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre (estimation)</Label>
              <Input id="nombre" type="number" min={0} {...register("nombre")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="caracteristiques">Caractéristiques</Label>
            <Textarea id="caracteristiques" {...register("caracteristiques")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="localisation">Localisation</Label>
            <Input id="localisation" {...register("localisation")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="besoins">Besoins</Label>
            <Textarea id="besoins" {...register("besoins")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vulnerabilites">Vulnérabilités</Label>
            <Textarea id="vulnerabilites" {...register("vulnerabilites")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteresSelection">Critères de sélection</Label>
            <Textarea id="criteresSelection" {...register("criteresSelection")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
