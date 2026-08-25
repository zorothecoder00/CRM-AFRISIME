"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createFundingOpportunity,
  linkFundingOpportunityToProject,
  deleteFundingOpportunity,
} from "@/actions/funding-opportunity.actions";
import {
  createFundingOpportunitySchema,
  type CreateFundingOpportunityInput,
} from "@/lib/validations/funding-opportunity.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type FundingOpportunityPipelineRow = {
  id: string;
  bailleur: string;
  deadline: string | null;
  budgetDisponible: number | null;
  paysEligibles: string | null;
  secteurs: string | null;
  criteres: string | null;
  projectId: string | null;
  projectNom: string | null;
};

type ProjectOption = { id: string; label: string };

/** Pipeline global des appels à projets (Project Studio §26) — indépendant de tout projet tant que non lié. */
export function FundingOpportunityPipeline({
  opportunities,
  projects,
  canManage,
}: {
  opportunities: FundingOpportunityPipelineRow[];
  projects: ProjectOption[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteFundingOpportunity, { successMessage: "Opportunité supprimée." });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">{canManage && <OpportunityFormDialog />}</div>

      {opportunities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune opportunité de financement suivie pour le moment.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => (
            <Card key={o.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-medium">{o.bailleur}</div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ fundingOpportunityId: o.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {o.deadline && (
                  <p className="text-xs text-muted-foreground">Échéance : {new Date(o.deadline).toLocaleDateString("fr-FR")}</p>
                )}
                {o.budgetDisponible != null && (
                  <p className="text-xs text-muted-foreground">Budget disponible : {o.budgetDisponible}</p>
                )}
                {o.secteurs && <p className="text-xs text-muted-foreground">Secteurs : {o.secteurs}</p>}
                {o.paysEligibles && <p className="text-xs text-muted-foreground">Pays éligibles : {o.paysEligibles}</p>}
                {o.projectNom ? (
                  <Badge variant="success">Lié à : {o.projectNom}</Badge>
                ) : canManage ? (
                  <LinkToProjectSelect opportunityId={o.id} projects={projects} />
                ) : (
                  <Badge variant="secondary">Non lié</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkToProjectSelect({ opportunityId, projects }: { opportunityId: string; projects: ProjectOption[] }) {
  const { run: link } = useAction(linkFundingOpportunityToProject, { successMessage: "Opportunité liée au projet." });

  if (projects.length === 0) return null;

  return (
    <Select onValueChange={(v) => link({ fundingOpportunityId: opportunityId, projectId: v })}>
      <SelectTrigger className="h-7 w-full text-xs">
        <SelectValue placeholder="Lier à un projet..." />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OpportunityFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFundingOpportunityInput>({ resolver: zodResolver(createFundingOpportunitySchema) });
  const { run: submit, isPending } = useAction(createFundingOpportunity, { successMessage: "Opportunité ajoutée." });

  async function onSubmit(data: CreateFundingOpportunityInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({});
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="paysEligibles">Pays éligibles</Label>
              <Input id="paysEligibles" {...register("paysEligibles")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secteurs">Secteurs</Label>
              <Input id="secteurs" {...register("secteurs")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiaires">Bénéficiaires visés</Label>
            <Textarea id="beneficiaires" {...register("beneficiaires")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteres">Critères d&apos;éligibilité</Label>
            <Textarea id="criteres" {...register("criteres")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documents">Documents requis</Label>
            <Textarea id="documents" {...register("documents")} />
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
