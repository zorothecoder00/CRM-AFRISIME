"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectFeedback,
  updateProjectFeedbackStatus,
  deleteProjectFeedback,
} from "@/actions/project.actions";
import { createProjectFeedbackSchema, type CreateProjectFeedbackInput } from "@/lib/validations/project.schema";
import { computeFeedbackSummary } from "@/lib/beneficiary-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Star, MessageSquareText } from "lucide-react";

export type FeedbackRow = {
  id: string;
  type: string;
  contenu: string;
  note: number | null;
  auteurNom: string | null;
  statut: string;
  reponse: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  ENQUETE: "Enquête",
  SATISFACTION: "Satisfaction",
  FEEDBACK: "Feedback",
  PLAINTE: "Plainte",
  SUGGESTION: "Suggestion",
  TEMOIGNAGE: "Témoignage",
};

const STATUT_LABELS: Record<string, string> = {
  NOUVEAU: "Nouvelle",
  EN_TRAITEMENT: "En traitement",
  TRAITE: "Traitée",
};

export function ProjectFeedbackSection({
  projectId,
  feedbacks,
  canManage,
}: {
  projectId: string;
  feedbacks: FeedbackRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteProjectFeedback, { successMessage: "Retour supprimé." });
  const summary = computeFeedbackSummary(feedbacks);

  const sorted = [...feedbacks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Enquêtes, satisfaction, feedback, plaintes, suggestions, témoignages — alimente le suivi-évaluation.
          </span>
          {summary.satisfactionMoyenne !== null && (
            <Badge variant="outline">
              <Star className="mr-1 h-3 w-3" />
              {summary.satisfactionMoyenne}/5 ({summary.satisfactionCount} avis)
            </Badge>
          )}
          {summary.plaintesTotal > 0 && (
            <Badge variant={summary.plaintesOuvertes > 0 ? "destructive" : "outline"}>
              {summary.plaintesOuvertes} plainte(s) ouverte(s) sur {summary.plaintesTotal}
            </Badge>
          )}
        </div>
        {canManage && <FeedbackFormDialog projectId={projectId} />}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun retour enregistré.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => (
            <Card key={f.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{TYPE_LABELS[f.type]}</Badge>
                        {f.note !== null && (
                          <span className="text-xs text-muted-foreground">
                            <Star className="mr-0.5 inline h-3 w-3" />
                            {f.note}/5
                          </span>
                        )}
                        {f.type === "PLAINTE" && (
                          <Badge variant={f.statut === "TRAITE" ? "outline" : "destructive"}>
                            {STATUT_LABELS[f.statut]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{f.contenu}</p>
                      <div className="text-xs text-muted-foreground">
                        {f.auteurNom && <>{f.auteurNom} · </>}
                        {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                      {f.reponse && (
                        <p className="mt-1 rounded bg-muted/50 p-1.5 text-xs">
                          <span className="font-medium">Réponse : </span>
                          {f.reponse}
                        </p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ feedbackId: f.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {canManage && f.type === "PLAINTE" && <FeedbackTreatmentForm feedback={f} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackTreatmentForm({ feedback }: { feedback: FeedbackRow }) {
  const [reponse, setReponse] = useState(feedback.reponse ?? "");
  const { run: setStatus, isPending } = useAction(updateProjectFeedbackStatus, { successMessage: "Traitement mis à jour." });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-2">
      <Select
        value={feedback.statut}
        onValueChange={(v) => setStatus({ feedbackId: feedback.id, statut: v as never, reponse })}
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
      <Input
        placeholder="Réponse apportée..."
        value={reponse}
        onChange={(e) => setReponse(e.target.value)}
        className="h-7 flex-1 text-xs"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => setStatus({ feedbackId: feedback.id, statut: feedback.statut as never, reponse })}
      >
        Enregistrer
      </Button>
    </div>
  );
}

function FeedbackFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectFeedbackInput>({
    resolver: zodResolver(createProjectFeedbackSchema),
    defaultValues: { projectId, type: "FEEDBACK" },
  });
  const { run: submit, isPending } = useAction(createProjectFeedback, { successMessage: "Retour ajouté." });

  async function onSubmit(data: CreateProjectFeedbackInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, type: "FEEDBACK" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau retour
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un retour</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue="FEEDBACK" onValueChange={(v) => setValue("type", v as CreateProjectFeedbackInput["type"])}>
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
            <Label htmlFor="contenu">Contenu</Label>
            <Textarea id="contenu" {...register("contenu")} />
            {errors.contenu && <p className="text-sm text-destructive">{errors.contenu.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note de satisfaction (1-5, facultatif)</Label>
            <Input id="note" type="number" min={1} max={5} {...register("note")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auteurNom">Auteur (facultatif)</Label>
            <Input id="auteurNom" placeholder="Ex. Bénéficiaire, partenaire..." {...register("auteurNom")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le retour"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
