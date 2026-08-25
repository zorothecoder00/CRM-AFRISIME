"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createFinancement, updateFinancementStatut, deleteFinancement } from "@/actions/financement.actions";
import { createFinancementSchema, type CreateFinancementInput } from "@/lib/validations/financement.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForFinancementStatut } from "@/lib/status-tone";
import { Plus, Trash2 } from "lucide-react";

export type FinancementRow = {
  id: string;
  bailleur: string;
  montant: number;
  statut: string;
  dateObtention: string | null;
  dateEcheance: string | null;
  notes: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  RECHERCHE: "Recherché",
  NEGOCIATION: "En négociation",
  OBTENU: "Obtenu",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
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
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove({ financementId: f.id })}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
