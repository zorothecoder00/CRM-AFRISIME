"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createFinancement,
  updateFinancementStatut,
  updateFinancementDetails,
  deleteFinancement,
} from "@/actions/financement.actions";
import {
  createFinancementSchema,
  updateFinancementDetailsSchema,
  type CreateFinancementInput,
  type UpdateFinancementDetailsInput,
} from "@/lib/validations/financement.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForFinancementStatut } from "@/lib/status-tone";
import { Plus, Settings2, Trash2 } from "lucide-react";

export type FinancementRow = {
  id: string;
  bailleur: string;
  montant: number;
  statut: string;
  source: string | null;
  convention: string | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  conditions: string | null;
  livrablesRequis: string | null;
  rapportsRequis: string | null;
  indicateursImposes: string | null;
  dateObtention: string | null;
  dateEcheance: string | null;
  notes: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  SOLLICITE: "Sollicité",
  RECHERCHE: "Recherché",
  NEGOCIATION: "En négociation",
  APPROUVE: "Approuvé",
  OBTENU: "Obtenu",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
};

const SOURCE_LABELS: Record<string, string> = {
  FONDS_PROPRES: "Fonds propres",
  SUBVENTION: "Subvention",
  PRET: "Prêt",
  INVESTISSEMENT: "Investissement",
  BAILLEUR: "Bailleur",
  PARTENAIRE: "Partenaire",
  SPONSORING: "Sponsoring",
  CONTRIBUTION_NATURE: "Contribution en nature",
};

export function ProjectFinancementsSection({
  projectId,
  financements,
  devise,
  canManage,
}: {
  projectId: string;
  financements: FinancementRow[];
  devise: string;
  canManage: boolean;
}) {
  const { run: setStatut } = useAction(updateFinancementStatut, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteFinancement, { successMessage: "Financement supprimé." });

  const totalObtenu = financements.filter((f) => f.statut === "OBTENU").reduce((sum, f) => sum + f.montant, 0);
  const totalRecherche = financements
    .filter((f) => f.statut === "RECHERCHE" || f.statut === "NEGOCIATION")
    .reduce((sum, f) => sum + f.montant, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="success">Obtenu : {totalObtenu} {devise}</Badge>
          <Badge variant="secondary">Recherché : {totalRecherche} {devise}</Badge>
        </div>
        {canManage && <FinancementFormDialog projectId={projectId} />}
      </div>

      {financements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun financement enregistré.</p>
      ) : (
        <div className="space-y-2">
          {financements.map((f) => (
            <Card key={f.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{f.bailleur}</div>
                    <p className="text-sm text-muted-foreground">
                      {f.montant} {devise}
                      {f.source && ` · ${SOURCE_LABELS[f.source] ?? f.source}`}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <FinancementDetailsDialog financement={f} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove({ financementId: f.id })}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {canManage ? (
                    <Select
                      value={f.statut}
                      onValueChange={(v) => setStatut({ financementId: f.id, statut: v as never })}
                    >
                      <SelectTrigger className="h-7 w-auto text-xs">
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
                  ) : (
                    <Badge variant={toneForFinancementStatut(f.statut)}>{STATUT_LABELS[f.statut]}</Badge>
                  )}
                  {f.dateEcheance && (
                    <span className="text-muted-foreground">
                      Échéance : {new Date(f.dateEcheance).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
                {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
                {(f.convention || f.livrablesRequis || f.rapportsRequis) && (
                  <div className="space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
                    {f.convention && <p>Convention : {f.convention}</p>}
                    {f.livrablesRequis && <p>Livrables requis : {f.livrablesRequis}</p>}
                    {f.rapportsRequis && <p>Rapports requis : {f.rapportsRequis}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FinancementFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateFinancementInput>({
    resolver: zodResolver(createFinancementSchema),
    defaultValues: { projectId, statut: "RECHERCHE" },
  });
  const { run: submit, isPending } = useAction(createFinancement, { successMessage: "Financement ajouté." });

  async function onSubmit(data: CreateFinancementInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, statut: "RECHERCHE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau financement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un financement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bailleur">Bailleur</Label>
            <Input id="bailleur" placeholder="Ex. Union Européenne, Banque Mondiale..." {...register("bailleur")} />
            {errors.bailleur && <p className="text-sm text-destructive">{errors.bailleur.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant</Label>
              <Input id="montant" type="number" step="0.01" {...register("montant")} />
              {errors.montant && <p className="text-sm text-destructive">{errors.montant.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select defaultValue="RECHERCHE" onValueChange={(v) => setValue("statut", v as CreateFinancementInput["statut"])}>
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
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select onValueChange={(v) => setValue("source", v as CreateFinancementInput["source"])}>
              <SelectTrigger>
                <SelectValue placeholder="Optionnel" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateObtention">Date d&apos;obtention</Label>
              <Input id="dateObtention" type="date" {...register("dateObtention")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEcheance">Échéance</Label>
              <Input id="dateEcheance" type="date" {...register("dateEcheance")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le financement"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

/** Donor/Bailleur Management (§25) — convention, période, exigences de reporting. */
function FinancementDetailsDialog({ financement }: { financement: FinancementRow }) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue } = useForm<UpdateFinancementDetailsInput>({
    resolver: zodResolver(updateFinancementDetailsSchema),
    defaultValues: {
      financementId: financement.id,
      source: (financement.source as UpdateFinancementDetailsInput["source"]) ?? undefined,
      convention: financement.convention ?? "",
      periodeDebut: toDateInputValue(financement.periodeDebut),
      periodeFin: toDateInputValue(financement.periodeFin),
      conditions: financement.conditions ?? "",
      livrablesRequis: financement.livrablesRequis ?? "",
      rapportsRequis: financement.rapportsRequis ?? "",
      indicateursImposes: financement.indicateursImposes ?? "",
    },
  });
  const { run: submit, isPending } = useAction(updateFinancementDetails, { successMessage: "Détails mis à jour." });

  async function onSubmit(data: UpdateFinancementDetailsInput) {
    const result = await submit(data);
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Détails du financement">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails du financement — {financement.bailleur}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              defaultValue={financement.source ?? undefined}
              onValueChange={(v) => setValue("source", v as UpdateFinancementDetailsInput["source"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optionnel" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="convention">Convention</Label>
            <Input id="convention" placeholder="Référence de la convention" {...register("convention")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="periodeDebut">Début de la période</Label>
              <Input id="periodeDebut" type="date" {...register("periodeDebut")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodeFin">Fin de la période</Label>
              <Input id="periodeFin" type="date" {...register("periodeFin")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions</Label>
            <Textarea id="conditions" {...register("conditions")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="livrablesRequis">Livrables requis</Label>
            <Textarea id="livrablesRequis" {...register("livrablesRequis")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rapportsRequis">Rapports requis</Label>
            <Textarea id="rapportsRequis" {...register("rapportsRequis")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="indicateursImposes">Indicateurs imposés</Label>
            <Textarea id="indicateursImposes" {...register("indicateursImposes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
