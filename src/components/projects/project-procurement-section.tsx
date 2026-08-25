"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProcurementItem, updateProcurementItemStatut, deleteProcurementItem } from "@/actions/procurement.actions";
import { createProcurementItemSchema, type CreateProcurementItemInput } from "@/lib/validations/procurement.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type ProcurementItemRow = {
  id: string;
  besoin: string;
  specifications: string | null;
  quantite: number | null;
  budget: number | null;
  fournisseurNom: string | null;
  methodeAchat: string | null;
  echeance: string | null;
  statut: string;
};

const STATUT_LABELS: Record<string, string> = {
  BESOIN_IDENTIFIE: "Besoin identifié",
  EN_COURS: "En cours",
  COMMANDE: "Commandé",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

/** Procurement Plan (Project Studio §34). */
export function ProjectProcurementSection({
  projectId,
  items,
  fournisseurs,
  devise,
  canManage,
}: {
  projectId: string;
  items: ProcurementItemRow[];
  fournisseurs: { id: string; label: string }[];
  devise: string;
  canManage: boolean;
}) {
  const { run: setStatut } = useAction(updateProcurementItemStatut, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteProcurementItem, { successMessage: "Besoin supprimé." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Besoins d&apos;achat prévus pour ce projet.</p>
        {canManage && <ProcurementFormDialog projectId={projectId} fournisseurs={fournisseurs} />}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun besoin d&apos;achat enregistré.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{item.besoin}</div>
                    {item.specifications && <p className="text-xs text-muted-foreground">{item.specifications}</p>}
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ procurementItemId: item.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.quantite != null && <span>Quantité : {item.quantite}</span>}
                  {item.budget != null && <span>Budget : {item.budget.toLocaleString("fr-FR")} {devise}</span>}
                  {item.fournisseurNom && <span>Fournisseur : {item.fournisseurNom}</span>}
                  {item.methodeAchat && <span>Méthode : {item.methodeAchat}</span>}
                  {item.echeance && <span>Échéance : {new Date(item.echeance).toLocaleDateString("fr-FR")}</span>}
                </div>
                {canManage ? (
                  <Select value={item.statut} onValueChange={(v) => setStatut({ procurementItemId: item.id, statut: v as never })}>
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
                  <span className="text-xs text-muted-foreground">{STATUT_LABELS[item.statut]}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcurementFormDialog({ projectId, fournisseurs }: { projectId: string; fournisseurs: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProcurementItemInput>({
    resolver: zodResolver(createProcurementItemSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProcurementItem, { successMessage: "Besoin ajouté." });

  async function onSubmit(data: CreateProcurementItemInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau besoin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un besoin d&apos;achat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pi-besoin">Besoin</Label>
            <Input id="pi-besoin" {...register("besoin")} />
            {errors.besoin && <p className="text-sm text-destructive">{errors.besoin.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-specifications">Spécifications</Label>
            <Textarea id="pi-specifications" {...register("specifications")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pi-quantite">Quantité</Label>
              <Input id="pi-quantite" type="number" step="0.01" {...register("quantite")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-budget">Budget</Label>
              <Input id="pi-budget" type="number" step="0.01" {...register("budget")} />
            </div>
          </div>
          {fournisseurs.length > 0 && (
            <div className="space-y-2">
              <Label>Fournisseur (optionnel)</Label>
              <Select onValueChange={(v) => setValue("fournisseurId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pi-methode">Méthode d&apos;achat</Label>
              <Input id="pi-methode" placeholder="Ex. Appel d'offres, gré à gré..." {...register("methodeAchat")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-echeance">Échéance</Label>
              <Input id="pi-echeance" type="date" {...register("echeance")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
