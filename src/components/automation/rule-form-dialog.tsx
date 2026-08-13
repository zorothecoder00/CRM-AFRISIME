"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createRule } from "@/actions/automation.actions";
import { createRuleSchema, type CreateRuleInput } from "@/lib/validations/automation.schema";
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
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

const TRIGGER_OPTIONS = [
  { value: "TASK_COMPLETED", label: "Une tâche est terminée" },
  { value: "TASK_VALIDATION_REJECTED", label: "Une validation de tâche est refusée" },
  { value: "DEADLINE_APPROACHING", label: "Une échéance approche" },
  { value: "PROJECT_COMPLETED", label: "Le projet atteint 100 %" },
  { value: "TASK_OVERDUE", label: "Une tâche est en retard (évalué chaque jour)" },
  { value: "PROJECT_OVERDUE", label: "Le projet est en retard (évalué chaque jour)" },
  { value: "BUDGET_EXCEEDED", label: "Le budget du projet est dépassé (évalué chaque jour)" },
  { value: "RISK_CRITICAL", label: "Un risque critique est actif (évalué chaque jour)" },
];

const ACTION_OPTIONS = [
  { value: "CREATE_NEXT_TASK", label: "Créer automatiquement une tâche" },
  { value: "SEND_REMINDER", label: "Envoyer un rappel au responsable" },
  { value: "NOTIFY_STAKEHOLDERS", label: "Notifier les parties prenantes du projet" },
  { value: "ESCALATE_TO_MANAGER", label: "Escalader au manager du responsable" },
  { value: "MARK_TASK_BLOCKED", label: "Marquer la tâche comme bloquée" },
];

export function RuleFormDialog({ projectId, users }: { projectId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<CreateRuleInput["action"]>("NOTIFY_STAKEHOLDERS");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRuleInput>({
    resolver: zodResolver(createRuleSchema),
    defaultValues: { projectId, trigger: "TASK_COMPLETED", action: "NOTIFY_STAKEHOLDERS" },
  });
  const { run: submit, isPending } = useAction(createRule, { successMessage: "Règle créée." });

  async function onSubmit(data: CreateRuleInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset();
      setAction("NOTIFY_STAKEHOLDERS");
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

          {action === "CREATE_NEXT_TASK" && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="nextTaskTitre">Titre de la tâche à créer</Label>
                <Input id="nextTaskTitre" {...register("nextTaskTitre")} />
                {errors.nextTaskTitre && (
                  <p className="text-sm text-destructive">{errors.nextTaskTitre.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select onValueChange={(v) => setValue("nextTaskResponsableId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.nextTaskResponsableId && (
                  <p className="text-sm text-destructive">{errors.nextTaskResponsableId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextTaskDelaiJours">Échéance (jours après création)</Label>
                <Input id="nextTaskDelaiJours" type="number" {...register("nextTaskDelaiJours")} />
              </div>
            </div>
          )}

          {action === "SEND_REMINDER" && (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="reminderDelaiJours">
                Jours avant échéance (utilisé si le déclencheur est « échéance approche »)
              </Label>
              <Input id="reminderDelaiJours" type="number" defaultValue={3} {...register("reminderDelaiJours")} />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la règle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
