"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createRule } from "@/actions/automation.actions";
import { createRuleSchema, type CreateRuleInput } from "@/lib/validations/automation.schema";
import { AutomationActionFields, type Option } from "@/components/automation/automation-action-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TRIGGER_OPTIONS = [
  { value: "TASK_COMPLETED", label: "Une tâche est terminée" },
  { value: "TASK_VALIDATION_REJECTED", label: "Une validation de tâche est refusée" },
  { value: "DEADLINE_APPROACHING", label: "Une échéance approche" },
  { value: "PROJECT_COMPLETED", label: "Le projet atteint 100 %" },
  { value: "TASK_OVERDUE", label: "Une tâche est en retard (évalué chaque jour)" },
  { value: "PROJECT_OVERDUE", label: "Le projet est en retard (évalué chaque jour)" },
  { value: "BUDGET_EXCEEDED", label: "Le budget du projet est dépassé (évalué chaque jour)" },
  { value: "RISK_CRITICAL", label: "Un risque critique est actif (évalué chaque jour)" },
  { value: "TASK_CREATED", label: "Une tâche est créée" },
  { value: "TASK_STATUS_CHANGED", label: "Le statut d'une tâche change" },
  { value: "PROJECT_STATUS_CHANGED", label: "Le statut du projet change" },
  { value: "OPPORTUNITY_CREATED", label: "Une nouvelle opportunité CRM est créée" },
  { value: "RISK_CREATED", label: "Un nouveau risque est créé" },
  { value: "DECISION_CREATED", label: "Une décision est prise" },
  { value: "MEETING_CREATED", label: "Une réunion est créée" },
  { value: "EVENT_CREATED", label: "Un événement est créé" },
  { value: "INDICATOR_OFF_TARGET", label: "Un indicateur s'écarte de sa cible (évalué chaque jour)" },
  { value: "CONTRACT_CREATED", label: "Un nouveau contrat est créé" },
];

const ACTION_OPTIONS = [
  { value: "CREATE_NEXT_TASK", label: "Créer automatiquement une tâche" },
  { value: "SEND_REMINDER", label: "Envoyer un rappel au responsable" },
  { value: "NOTIFY_STAKEHOLDERS", label: "Notifier les parties prenantes du projet" },
  { value: "ESCALATE_TO_MANAGER", label: "Escalader au manager du responsable" },
  { value: "MARK_TASK_BLOCKED", label: "Marquer la tâche comme bloquée" },
  { value: "ASSIGN_USER", label: "Assigner un utilisateur" },
  { value: "SEND_EMAIL", label: "Envoyer un email (journalisé, non envoyé)" },
  { value: "CHANGE_STATUS", label: "Modifier le statut" },
  { value: "CREATE_MEETING", label: "Créer une réunion" },
  { value: "CREATE_ADMIN_REQUEST", label: "Créer une demande" },
  { value: "CREATE_RISK", label: "Créer un risque" },
  { value: "GENERATE_REPORT", label: "Générer un rapport" },
  { value: "REQUEST_VALIDATION", label: "Demander une validation" },
  { value: "TRIGGER_WORKFLOW", label: "Déclencher une autre règle" },
  { value: "CREATE_DEADLINE", label: "Créer une échéance" },
];

const CONDITION_FIELD_OPTIONS = [
  { value: "task.retardJours", label: "Retard de la tâche (jours)" },
  { value: "task.priorite", label: "Priorité de la tâche" },
  { value: "project.critique", label: "Le projet est critique (true/false)" },
  { value: "project.retardJours", label: "Retard du projet (jours)" },
  { value: "project.budgetDepasse", label: "Budget dépassé (true/false)" },
  { value: "project.statut", label: "Statut du projet" },
  { value: "risk.probabilite", label: "Probabilité du risque" },
  { value: "risk.impact", label: "Impact du risque" },
  { value: "risk.criticite", label: "Criticité du risque" },
  { value: "opportunity.probabilite", label: "Probabilité de l'opportunité (%)" },
  { value: "opportunity.montantEstime", label: "Montant estimé de l'opportunité" },
  { value: "indicator.ecartPourcent", label: "Écart cible/actuel de l'indicateur (%)" },
];

const OPERATOR_OPTIONS = [
  { value: "EQUALS", label: "est égal à" },
  { value: "NOT_EQUALS", label: "est différent de" },
  { value: "GREATER_THAN", label: "est supérieur à" },
  { value: "LESS_THAN", label: "est inférieur à" },
  { value: "CONTAINS", label: "contient" },
];

const emptyCondition = () => ({
  champ: CONDITION_FIELD_OPTIONS[0].value,
  operateur: "EQUALS" as const,
  valeur: "",
  connecteur: "ET" as const,
});

export function RuleFormDialog({
  projectId,
  users,
  existingRules = [],
}: {
  /** Omis = règle globale (V2.2 §7), non liée à un projet. */
  projectId?: string;
  users: Option[];
  existingRules?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<CreateRuleInput["action"]>("NOTIFY_STAKEHOLDERS");
  const [showConditions, setShowConditions] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRuleInput>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: { projectId, trigger: "TASK_COMPLETED", action: "NOTIFY_STAKEHOLDERS", conditions: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const { run: submit, isPending } = useAction(createRule, { successMessage: "Règle créée." });

  async function onSubmit(data: CreateRuleInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, trigger: "TASK_COMPLETED", action: "NOTIFY_STAKEHOLDERS", conditions: [] });
      setAction("NOTIFY_STAKEHOLDERS");
      setShowConditions(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle règle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une règle d&apos;automatisation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la règle</Label>
            <Input id="nom" placeholder="Ex. Recette après chaque tâche" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Si (déclencheur)</Label>
            <Select
              defaultValue="TASK_COMPLETED"
              onValueChange={(v) => setValue("trigger", v as CreateRuleInput["trigger"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions (facultatif)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowConditions((v) => !v)}>
                {showConditions ? "Masquer" : "Ajouter des conditions"}
              </Button>
            </div>
            {showConditions && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Toutes évaluées dans l&apos;ordre (ET/OU s&apos;applique à la condition suivante), ex. « projet
                  critique ET retard &gt; 3 jours ».
                </p>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border p-2">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Select
                          defaultValue={CONDITION_FIELD_OPTIONS[0].value}
                          onValueChange={(v) => setValue(`conditions.${index}.champ`, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_FIELD_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          defaultValue="EQUALS"
                          onValueChange={(v) =>
                            setValue(`conditions.${index}.operateur`, v as CreateRuleInput["conditions"][number]["operateur"])
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATOR_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Valeur"
                          className="h-8 text-xs"
                          {...register(`conditions.${index}.valeur`)}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {index < fields.length - 1 && (
                      <Select
                        defaultValue="ET"
                        onValueChange={(v) =>
                          setValue(`conditions.${index}.connecteur`, v as CreateRuleInput["conditions"][number]["connecteur"])
                        }
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ET">ET</SelectItem>
                          <SelectItem value="OU">OU</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append(emptyCondition())}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter une condition
                </Button>
                <div className="space-y-2 border-t pt-2">
                  <Label>Sinon (ELSE) — déclencher une autre règle (facultatif)</Label>
                  <Select onValueChange={(v) => setValue("elseRuleId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingRules.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Alors (action)</Label>
            <Select
              defaultValue="NOTIFY_STAKEHOLDERS"
              onValueChange={(v) => {
                const next = v as CreateRuleInput["action"];
                setAction(next);
                setValue("action", next);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AutomationActionFields
            action={action}
            register={register}
            setValue={setValue}
            users={users}
            existingRules={existingRules}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la règle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
