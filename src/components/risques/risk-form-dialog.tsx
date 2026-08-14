"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createOrganizationalRisk, updateOrganizationalRisk } from "@/actions/risk.actions";
import {
  createOrganizationalRiskSchema,
  updateOrganizationalRiskSchema,
  type CreateOrganizationalRiskInput,
  type UpdateOrganizationalRiskInput,
} from "@/lib/validations/risk.schema";
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
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };

const PROBABILITE_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYENNE: "Moyenne", ELEVEE: "Élevée" };
const IMPACT_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
  SURVENU: "Survenu",
  CLOS: "Clos",
};

export type RiskFormValues = {
  id: string;
  titre: string;
  description: string | null;
  categorie: string | null;
  origine: string | null;
  probabilite: string;
  impact: string;
  responsableId: string | null;
  projectId: string | null;
  processusId: string | null;
  mesuresPreventives: string | null;
  planMitigation: string | null;
  echeance: string | null;
  statut: string;
};

export function RiskFormDialog({
  risk,
  users,
  projects,
  processus,
}: {
  risk?: RiskFormValues;
  users: Option[];
  projects: Option[];
  processus: Option[];
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!risk;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateOrganizationalRiskInput | UpdateOrganizationalRiskInput>({
    resolver: zodResolver(isEdit ? updateOrganizationalRiskSchema : createOrganizationalRiskSchema),
    defaultValues: risk
      ? {
          riskId: risk.id,
          titre: risk.titre,
          description: risk.description ?? undefined,
          categorie: risk.categorie ?? undefined,
          origine: risk.origine ?? undefined,
          probabilite: risk.probabilite as CreateOrganizationalRiskInput["probabilite"],
          impact: risk.impact as CreateOrganizationalRiskInput["impact"],
          responsableId: risk.responsableId ?? undefined,
          projectId: risk.projectId ?? undefined,
          processusId: risk.processusId ?? undefined,
          mesuresPreventives: risk.mesuresPreventives ?? undefined,
          planMitigation: risk.planMitigation ?? undefined,
          echeance: risk.echeance ? risk.echeance.slice(0, 10) : undefined,
          statut: risk.statut as UpdateOrganizationalRiskInput["statut"],
        }
      : { probabilite: "MOYENNE", impact: "MOYEN" },
  });
  const { run: create, isPending: creating } = useAction(createOrganizationalRisk, {
    successMessage: "Risque ajouté.",
  });
  const { run: update, isPending: updating } = useAction(updateOrganizationalRisk, {
    successMessage: "Risque mis à jour.",
  });
  const isPending = creating || updating;

  async function onSubmit(data: CreateOrganizationalRiskInput | UpdateOrganizationalRiskInput) {
    const result = isEdit
      ? await update(data as UpdateOrganizationalRiskInput)
      : await create(data as CreateOrganizationalRiskInput);
    if (result.ok) {
      if (!isEdit) reset({ probabilite: "MOYENNE", impact: "MOYEN" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau risque
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le risque" : "Identifier un risque"}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input id="categorie" placeholder="Ex : Financier, Opérationnel" {...register("categorie")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origine">Origine</Label>
              <Input id="origine" placeholder="Ex : Interne, Externe" {...register("origine")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Probabilité</Label>
              <Select
                defaultValue={risk?.probabilite ?? "MOYENNE"}
                onValueChange={(v) => setValue("probabilite", v as CreateOrganizationalRiskInput["probabilite"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROBABILITE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impact</Label>
              <Select
                defaultValue={risk?.impact ?? "MOYEN"}
                onValueChange={(v) => setValue("impact", v as CreateOrganizationalRiskInput["impact"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                defaultValue={risk?.statut}
                onValueChange={(v) => setValue("statut" as never, v as never)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                defaultValue={risk?.responsableId ?? undefined}
                onValueChange={(v) => setValue("responsableId", v)}
              >
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
            <div className="space-y-2">
              <Label htmlFor="echeance">Échéance</Label>
              <Input id="echeance" type="date" {...register("echeance")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Projet lié</Label>
              <Select
                defaultValue={risk?.projectId ?? undefined}
                onValueChange={(v) => setValue("projectId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Processus lié</Label>
              <Select
                defaultValue={risk?.processusId ?? undefined}
                onValueChange={(v) => setValue("processusId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {processus.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mesuresPreventives">Mesures préventives</Label>
            <Textarea id="mesuresPreventives" {...register("mesuresPreventives")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planMitigation">Plan de mitigation</Label>
            <Textarea id="planMitigation" {...register("planMitigation")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter le risque"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
