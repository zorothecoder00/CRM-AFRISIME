"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createValidationWorkflow } from "@/actions/validation-workflow.actions";
import {
  createValidationWorkflowSchema,
  type CreateValidationWorkflowInput,
} from "@/lib/validations/validation-workflow.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2 } from "lucide-react";

const ADMIN_REQUEST_TYPE_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  MISSION: "Mission",
  DECAISSEMENT: "Décaissement",
  MATERIEL: "Matériel",
  AUTORISATION: "Autorisation",
  RECRUTEMENT: "Recrutement",
  AUTRE: "Autre",
};

type Option = { id: string; label: string };

const emptyStep = () => ({
  approverRole: "" as CreateValidationWorkflowInput["steps"][number]["approverRole"],
  label: "",
  escaladeJours: "",
  escaladeRole: undefined,
  montantMin: "",
  montantMax: "",
});

export function WorkflowFormDialog({ roles, projects }: { roles: { key: string; label: string }[]; projects: Option[] }) {
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<CreateValidationWorkflowInput["entityType"]>("TASK");
  const [autoTask, setAutoTask] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateValidationWorkflowInput>({
    resolver: zodResolver(createValidationWorkflowSchema),
    defaultValues: {
      nom: "",
      entityType: "TASK",
      creerTacheAlApprobation: false,
      steps: [emptyStep()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "steps" });
  const { run: submit, isPending } = useAction(createValidationWorkflow, {
    successMessage: "Circuit de validation créé et activé.",
  });

  async function onSubmit(data: CreateValidationWorkflowInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ nom: "", entityType: "TASK", creerTacheAlApprobation: false, steps: [emptyStep()] });
      setEntityType("TASK");
      setAutoTask(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau circuit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un circuit de validation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ex: Demande → Responsable → Directeur → DG → Validation finale. La création active
            immédiatement ce circuit et désactive l&apos;ancien circuit couvrant exactement la même
            condition (type + montant).
          </p>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du circuit</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>S&apos;applique à</Label>
            <Select
              defaultValue="TASK"
              onValueChange={(v) => {
                const next = v as CreateValidationWorkflowInput["entityType"];
                setEntityType(next);
                setValue("entityType", next);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK">Tâches</SelectItem>
                <SelectItem value="ADMIN_REQUEST">Demandes administratives</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {entityType === "ADMIN_REQUEST" && (
            <div className="space-y-4 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Condition de sélection (cahier des charges §VIII) — laisser vide pour un circuit
                générique, applicable à défaut d&apos;un circuit plus spécifique.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de demande</Label>
                  <Select onValueChange={(v) => setValue("adminRequestType", v as CreateValidationWorkflowInput["adminRequestType"])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous types" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ADMIN_REQUEST_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montantMin">Montant minimum</Label>
                  <Input id="montantMin" type="number" step="0.01" placeholder="Aucun" {...register("montantMin")} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={autoTask}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setAutoTask(next);
                    setValue("creerTacheAlApprobation", next);
                  }}
                />
                <Label className="font-normal">Créer automatiquement une tâche/mission à l&apos;approbation finale</Label>
              </div>
              {autoTask && (
                <div className="space-y-2">
                  <Label>Projet d&apos;accueil de la tâche créée</Label>
                  <Select onValueChange={(v) => setValue("autoTaskProjectId", v)}>
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
                  {errors.autoTaskProjectId && (
                    <p className="text-sm text-destructive">{errors.autoTaskProjectId.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Étapes, dans l&apos;ordre</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-sm text-muted-foreground">{index + 1}.</span>
                  <Select
                    onValueChange={(v) =>
                      setValue(`steps.${index}.approverRole`, v as CreateValidationWorkflowInput["steps"][number]["approverRole"])
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Rôle approbateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <Input
                    type="number"
                    placeholder="Escalade après (jours)"
                    className="h-8 text-xs"
                    {...register(`steps.${index}.escaladeJours`)}
                  />
                  <Select onValueChange={(v) => setValue(`steps.${index}.escaladeRole`, v as CreateValidationWorkflowInput["steps"][number]["escaladeRole"])}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escalader vers (rôle)" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {entityType === "ADMIN_REQUEST" && (
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <Input
                      type="number"
                      placeholder="Condition : montant min"
                      className="h-8 text-xs"
                      {...register(`steps.${index}.montantMin`)}
                    />
                    <Input
                      type="number"
                      placeholder="Condition : montant max"
                      className="h-8 text-xs"
                      {...register(`steps.${index}.montantMax`)}
                    />
                  </div>
                )}
              </div>
            ))}
            {errors.steps && (
              <p className="text-sm text-destructive">{errors.steps.message ?? errors.steps.root?.message}</p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyStep())}>
              <Plus className="mr-1 h-4 w-4" />
              Ajouter une étape
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer et activer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
