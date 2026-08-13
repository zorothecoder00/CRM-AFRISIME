"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createEvaluation } from "@/actions/evaluation.actions";
import { createEvaluationSchema, type CreateEvaluationInput } from "@/lib/validations/evaluation.schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

const PERIODE_LABELS: Record<string, string> = {
  ANNUELLE: "Annuelle",
  SEMESTRIELLE: "Semestrielle",
  TRIMESTRIELLE: "Trimestrielle",
};

const TYPE_LABELS: Record<string, string> = {
  AUTO: "Auto-évaluation",
  MANAGER: "Évaluation manager",
  PAIRS_360: "Évaluation 360°",
  PROJET: "Évaluation projet",
};

/**
 * Types d'evaluation (cahier des charges §XII). L'auto-evaluation est
 * toujours proposee (self-service) ; les autres types ne le sont que si
 * `evaluables` est fourni (permission EVALUATION_MANAGE cote page).
 */
export function EvaluationFormDialog({
  currentUserId,
  currentUserName,
  evaluables,
  projects,
}: {
  currentUserId: string;
  currentUserName: string;
  /** Absent/vide = seule l'auto-évaluation est proposée. */
  evaluables?: Option[];
  projects?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreateEvaluationInput["type"]>("AUTO");
  const canEvaluateOthers = !!evaluables && evaluables.length > 0;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEvaluationInput>({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: { periode: "ANNUELLE", type: "AUTO", evalueId: currentUserId },
  });
  const { run: submit, isPending } = useAction(createEvaluation, {
    successMessage: "Évaluation créée en brouillon.",
  });

  async function onSubmit(data: CreateEvaluationInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ periode: "ANNUELLE", type: "AUTO", evalueId: currentUserId });
      setType("AUTO");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle évaluation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une évaluation de performance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              defaultValue="AUTO"
              onValueChange={(v) => {
                const next = v as CreateEvaluationInput["type"];
                setType(next);
                setValue("type", next);
                setValue("evalueId", next === "AUTO" ? currentUserId : "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">{TYPE_LABELS.AUTO}</SelectItem>
                {canEvaluateOthers && (
                  <>
                    <SelectItem value="MANAGER">{TYPE_LABELS.MANAGER}</SelectItem>
                    <SelectItem value="PAIRS_360">{TYPE_LABELS.PAIRS_360}</SelectItem>
                    <SelectItem value="PROJET">{TYPE_LABELS.PROJET}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {type === "AUTO" ? (
            <p className="text-sm text-muted-foreground">Collaborateur évalué : {currentUserName} (vous-même)</p>
          ) : (
            <div className="space-y-2">
              <Label>Collaborateur évalué</Label>
              <Select onValueChange={(v) => setValue("evalueId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {evaluables?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.evalueId && <p className="text-sm text-destructive">{errors.evalueId.message}</p>}
            </div>
          )}

          {type === "PROJET" && projects && projects.length > 0 && (
            <div className="space-y-2">
              <Label>Projet concerné</Label>
              <Select onValueChange={(v) => setValue("projectId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
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
          )}

          <div className="space-y-2">
            <Label>Périodicité</Label>
            <Select
              defaultValue="ANNUELLE"
              onValueChange={(v) => setValue("periode", v as CreateEvaluationInput["periode"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Début de la période</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Fin de la période</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsForts">Points forts</Label>
            <Textarea id="pointsForts" {...register("pointsForts")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="axesAmelioration">Axes d&apos;amélioration</Label>
            <Textarea id="axesAmelioration" {...register("axesAmelioration")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaireEvaluateur">Commentaire général</Label>
            <Textarea id="commentaireEvaluateur" {...register("commentaireEvaluateur")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer l'évaluation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
