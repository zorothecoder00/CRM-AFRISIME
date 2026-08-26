"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectMEEvaluation,
  updateProjectMEEvaluationCritere,
  updateProjectMEEvaluationConclusions,
  deleteProjectMEEvaluation,
} from "@/actions/project.actions";
import { createProjectMEEvaluationSchema, type CreateProjectMEEvaluationInput } from "@/lib/validations/project.schema";
import { indicatorProgress } from "@/lib/objective-progress";
import type { IndicatorData } from "@/components/objectives/indicator-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Star, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const CRITERE_LABELS: Record<string, string> = {
  PERTINENCE: "Pertinence",
  EFFICACITE: "Efficacité",
  EFFICIENCE: "Efficience",
  IMPACT: "Impact",
  DURABILITE: "Durabilité",
};

export type MECritereRow = {
  id: string;
  critere: string;
  note: number | null;
  commentaire: string | null;
};

export type MEEvaluationRow = {
  id: string;
  titre: string;
  dateEvaluation: string;
  evaluateurNom: string | null;
  conclusions: string | null;
  recommandations: string | null;
  criteres: MECritereRow[];
};

export function ProjectMESection({
  projectId,
  evaluations,
  indicators,
  canManage,
}: {
  projectId: string;
  evaluations: MEEvaluationRow[];
  indicators: IndicatorData[];
  canManage: boolean;
}) {
  const withProgress = indicators.map((i) => indicatorProgress(i.valeurActuelle, i.valeurCible));
  const avgProgress = withProgress.length > 0 ? Math.round(withProgress.reduce((a, b) => a + b, 0) / withProgress.length) : null;
  const withFrequence = indicators.filter((i) => i.frequence).length;

  const sorted = [...evaluations].sort((a, b) => new Date(b.dateEvaluation).getTime() - new Date(a.dateEvaluation).getTime());

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-medium">Suivi</h3>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{indicators.length} indicateur(s) suivi(s)</Badge>
          {avgProgress !== null && <Badge variant="outline">Progression moyenne : {avgProgress}%</Badge>}
          <Badge variant="outline">{withFrequence} avec fréquence de collecte définie</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Détail des indicateurs (baseline, cible, fréquence, source) dans l&apos;onglet KPI.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">Évaluation</h3>
          {canManage && <MEEvaluationFormDialog projectId={projectId} />}
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune évaluation enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((evaluation) => (
              <MEEvaluationCard key={evaluation.id} evaluation={evaluation} canManage={canManage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MEEvaluationCard({ evaluation, canManage }: { evaluation: MEEvaluationRow; canManage: boolean }) {
  const { run: remove } = useAction(deleteProjectMEEvaluation, { successMessage: "Évaluation supprimée." });
  const [conclusions, setConclusions] = useState(evaluation.conclusions ?? "");
  const [recommandations, setRecommandations] = useState(evaluation.recommandations ?? "");
  const { run: saveConclusions, isPending: savingConclusions } = useAction(updateProjectMEEvaluationConclusions, {
    successMessage: "Conclusions enregistrées.",
  });

  return (
    <Card size="sm">
      <CardContent className="space-y-3 px-(--card-spacing)">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{evaluation.titre}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(evaluation.dateEvaluation).toLocaleDateString("fr-FR")}
                {evaluation.evaluateurNom && <> · Évaluateur : {evaluation.evaluateurNom}</>}
              </div>
            </div>
          </div>
          {canManage && (
            <Button variant="ghost" size="icon-sm" onClick={() => remove({ evaluationId: evaluation.id })} aria-label="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {evaluation.criteres.map((c) => (
            <MECritereRowView key={c.id} critere={c} canManage={canManage} />
          ))}
        </div>

        {canManage ? (
          <div className="grid gap-2 border-t pt-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`conclusions-${evaluation.id}`} className="text-xs">
                Conclusions
              </Label>
              <Textarea
                id={`conclusions-${evaluation.id}`}
                value={conclusions}
                onChange={(e) => setConclusions(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`recommandations-${evaluation.id}`} className="text-xs">
                Recommandations
              </Label>
              <Textarea
                id={`recommandations-${evaluation.id}`}
                value={recommandations}
                onChange={(e) => setRecommandations(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-fit text-xs sm:col-span-2"
              disabled={savingConclusions}
              onClick={() => saveConclusions({ evaluationId: evaluation.id, conclusions, recommandations })}
            >
              Enregistrer
            </Button>
          </div>
        ) : (
          (evaluation.conclusions || evaluation.recommandations) && (
            <div className="space-y-1 border-t pt-2 text-xs">
              {evaluation.conclusions && (
                <p>
                  <span className="font-medium">Conclusions : </span>
                  {evaluation.conclusions}
                </p>
              )}
              {evaluation.recommandations && (
                <p>
                  <span className="font-medium">Recommandations : </span>
                  {evaluation.recommandations}
                </p>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

function MECritereRowView({ critere, canManage }: { critere: MECritereRow; canManage: boolean }) {
  const [commentaire, setCommentaire] = useState(critere.commentaire ?? "");
  const { run } = useAction(updateProjectMEEvaluationCritere, { successMessage: "Critère mis à jour." });

  return (
    <div className="rounded border p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{CRITERE_LABELS[critere.critere]}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canManage}
              onClick={() => run({ critereId: critere.id, note: n, commentaire })}
              aria-label={`Noter ${n}/5`}
              className={cn("disabled:cursor-default", canManage && "cursor-pointer")}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  critere.note !== null && n <= critere.note ? "fill-warning text-warning" : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      {canManage ? (
        <Input
          placeholder="Commentaire..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          onBlur={() => run({ critereId: critere.id, note: critere.note ?? undefined, commentaire })}
          className="mt-1 h-6 text-xs"
        />
      ) : (
        critere.commentaire && <p className="mt-1 text-xs text-muted-foreground">{critere.commentaire}</p>
      )}
    </div>
  );
}

function MEEvaluationFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectMEEvaluationInput>({
    resolver: zodResolver(createProjectMEEvaluationSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectMEEvaluation, { successMessage: "Évaluation créée." });

  async function onSubmit(data: CreateProjectMEEvaluationInput) {
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
          Nouvelle évaluation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle évaluation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" placeholder="Ex. Évaluation mi-parcours" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateEvaluation">Date</Label>
            <Input id="dateEvaluation" type="date" {...register("dateEvaluation")} />
            {errors.dateEvaluation && <p className="text-sm text-destructive">{errors.dateEvaluation.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="evaluateurNom">Évaluateur (facultatif)</Label>
            <Input id="evaluateurNom" placeholder="Ex. Consultant externe, bailleur..." {...register("evaluateurNom")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
