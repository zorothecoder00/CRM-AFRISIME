"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectChangeRequest, decideProjectChangeRequest } from "@/actions/project-change-request.actions";
import {
  createProjectChangeRequestSchema,
  type CreateProjectChangeRequestInput,
} from "@/lib/validations/project-change-request.schema";
import { computeChangeRequestImpact } from "@/lib/change-request-impact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export type ChangeRequestRow = {
  id: string;
  titre: string;
  description: string | null;
  budgetPropose: number | null;
  dateFinProposee: string | null;
  impactRessources: string | null;
  impactRisques: string | null;
  impactResultats: string | null;
  statut: "DEMANDE" | "APPROUVE" | "REJETE" | "MODIFICATION_DEMANDEE";
  demandeParName: string;
  commentaireDecision: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  DEMANDE: "Demandée",
  APPROUVE: "Approuvée",
  REJETE: "Rejetée",
  MODIFICATION_DEMANDEE: "Modification demandée",
};

const STATUT_TONE: Record<string, "warning" | "success" | "destructive" | "info"> = {
  DEMANDE: "warning",
  APPROUVE: "success",
  REJETE: "destructive",
  MODIFICATION_DEMANDEE: "info",
};

/** Change Request Management (Project Studio §31). */
export function ProjectChangeRequestsSection({
  projectId,
  changeRequests,
  budgetActuel,
  dateFinActuelle,
  devise,
  canManage,
}: {
  projectId: string;
  changeRequests: ChangeRequestRow[];
  budgetActuel: number | null;
  dateFinActuelle: string | null;
  devise: string;
  canManage: boolean;
}) {
  const { run: decide } = useAction(decideProjectChangeRequest, { successMessage: "Décision enregistrée." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Toute modification importante du projet (budget, calendrier) passe par une demande approuvée.
        </p>
        {canManage && <ChangeRequestFormDialog projectId={projectId} />}
      </div>

      {changeRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande de modification.</p>
      ) : (
        <div className="space-y-2">
          {changeRequests.map((cr) => {
            const impact = computeChangeRequestImpact({
              budgetActuel,
              budgetPropose: cr.budgetPropose,
              dateFinActuelle: dateFinActuelle ? new Date(dateFinActuelle) : null,
              dateFinProposee: cr.dateFinProposee ? new Date(cr.dateFinProposee) : null,
            });

            return (
              <Card key={cr.id} size="sm">
                <CardContent className="space-y-2 px-(--card-spacing)">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{cr.titre}</div>
                      <p className="text-xs text-muted-foreground">Demandée par {cr.demandeParName}</p>
                    </div>
                    <Badge variant={STATUT_TONE[cr.statut]}>{STATUT_LABELS[cr.statut]}</Badge>
                  </div>
                  {cr.description && <p className="text-sm text-muted-foreground">{cr.description}</p>}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {impact.impactFinancier !== null && (
                      <Badge variant="outline">
                        Impact budget : {impact.impactFinancier >= 0 ? "+" : ""}
                        {impact.impactFinancier.toLocaleString("fr-FR")} {devise}
                        {impact.impactFinancierPourcent !== null && ` (${impact.impactFinancierPourcent >= 0 ? "+" : ""}${impact.impactFinancierPourcent}%)`}
                      </Badge>
                    )}
                    {impact.impactCalendrierJours !== null && (
                      <Badge variant="outline">
                        Impact calendrier : {impact.impactCalendrierJours >= 0 ? "+" : ""}
                        {impact.impactCalendrierJours} j
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {cr.impactRessources && <p>Ressources : {cr.impactRessources}</p>}
                    {cr.impactRisques && <p>Risques : {cr.impactRisques}</p>}
                    {cr.impactResultats && <p>Résultats : {cr.impactResultats}</p>}
                  </div>

                  {cr.commentaireDecision && (
                    <p className="text-xs text-muted-foreground">Commentaire : {cr.commentaireDecision}</p>
                  )}

                  {canManage && cr.statut === "DEMANDE" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide({ changeRequestId: cr.id, decision: "APPROUVE" })}>
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => decide({ changeRequestId: cr.id, decision: "REJETE" })}
                      >
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide({ changeRequestId: cr.id, decision: "MODIFICATION_DEMANDEE" })}
                      >
                        Demander modification
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChangeRequestFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectChangeRequestInput>({
    resolver: zodResolver(createProjectChangeRequestSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectChangeRequest, { successMessage: "Demande créée." });

  async function onSubmit(data: CreateProjectChangeRequestInput) {
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
          Nouvelle demande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demande de modification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cr-titre">Titre</Label>
            <Input id="cr-titre" placeholder="Ex. Budget +20%" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-description">Description</Label>
            <Textarea id="cr-description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-budget">Nouveau budget proposé</Label>
              <Input id="cr-budget" type="number" step="0.01" {...register("budgetPropose")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-datefin">Nouvelle date de fin proposée</Label>
              <Input id="cr-datefin" type="date" {...register("dateFinProposee")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-ressources">Impact ressources</Label>
            <Textarea id="cr-ressources" {...register("impactRessources")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-risques">Impact risques</Label>
            <Textarea id="cr-risques" {...register("impactRisques")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr-resultats">Impact résultats</Label>
            <Textarea id="cr-resultats" {...register("impactResultats")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Envoi..." : "Soumettre la demande"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
