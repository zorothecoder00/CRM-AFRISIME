"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createFundingOpportunity, deleteFundingOpportunity } from "@/actions/funding-opportunity.actions";
import {
  createFundingOpportunitySchema,
  type CreateFundingOpportunityInput,
} from "@/lib/validations/funding-opportunity.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

export type FundingOpportunityRow = {
  id: string;
  bailleur: string;
  deadline: string | null;
  budgetDisponible: number | null;
  criteres: string | null;
  exigences: string | null;
};

/** Appel à projets / Funding Opportunity liées à ce projet (Project Studio §26). */
export function ProjectFundingOpportunitiesSection({
  projectId,
  opportunities,
  devise,
  canManage,
}: {
  projectId: string;
  opportunities: FundingOpportunityRow[];
  devise: string;
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteFundingOpportunity, { successMessage: "Opportunité supprimée." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Appels à projets / opportunités de financement suivis pour ce projet.</p>
        {canManage && <OpportunityFormDialog projectId={projectId} />}
      </div>

      {opportunities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune opportunité liée. Voir aussi le pipeline global des appels à projets.</p>
      ) : (
        <div className="space-y-2">
          {opportunities.map((o) => (
            <Card key={o.id} size="sm">
              <CardContent className="space-y-1 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{o.bailleur}</div>
                    {o.budgetDisponible != null && (
                      <p className="text-sm text-muted-foreground">
                        Budget disponible : {o.budgetDisponible} {devise}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ fundingOpportunityId: o.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {o.deadline && (
                  <p className="text-xs text-muted-foreground">Échéance : {new Date(o.deadline).toLocaleDateString("fr-FR")}</p>
                )}
                {o.criteres && <p className="text-xs text-muted-foreground">Critères : {o.criteres}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFundingOpportunityInput>({
    resolver: zodResolver(createFundingOpportunitySchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createFundingOpportunity, { successMessage: "Opportunité ajoutée." });

  async function onSubmit(data: CreateFundingOpportunityInput) {
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
          Nouvelle opportunité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un appel à projets</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bailleur">Bailleur</Label>
            <Input id="bailleur" {...register("bailleur")} />
            {errors.bailleur && <p className="text-sm text-destructive">{errors.bailleur.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetDisponible">Budget disponible</Label>
              <Input id="budgetDisponible" type="number" step="0.01" {...register("budgetDisponible")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteres">Critères d&apos;éligibilité</Label>
            <Textarea id="criteres" {...register("criteres")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exigences">Exigences</Label>
            <Textarea id="exigences" {...register("exigences")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
