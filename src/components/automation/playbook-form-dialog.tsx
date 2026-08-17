"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createPlaybook } from "@/actions/orchestration.actions";
import { createPlaybookSchema, type CreatePlaybookInput } from "@/lib/validations/orchestration.schema";
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
  { value: "PROJECT_STATUS_CHANGED", label: "Le statut du projet change (ex. vers « Prêt pour exécution »)" },
  { value: "TASK_COMPLETED", label: "Une tâche est terminée" },
  { value: "PROJECT_COMPLETED", label: "Le projet atteint 100 %" },
  { value: "TASK_CREATED", label: "Une tâche est créée" },
  { value: "OPPORTUNITY_CREATED", label: "Une nouvelle opportunité CRM est créée" },
  { value: "RISK_CREATED", label: "Un nouveau risque est créé" },
  { value: "DECISION_CREATED", label: "Une décision est prise" },
];

const ACTION_OPTIONS = [
  { value: "VERIFY_RESOURCES", label: "Vérifier les ressources" },
  { value: "VERIFY_RISKS", label: "Vérifier les risques" },
  { value: "CREATE_NEXT_TASK", label: "Créer une tâche" },
  { value: "ASSIGN_USER", label: "Assigner un utilisateur" },
  { value: "CREATE_MEETING", label: "Programmer une réunion" },
  { value: "NOTIFY_STAKEHOLDERS", label: "Informer les parties prenantes" },
  { value: "OPEN_TRACKING_BOARD", label: "Ouvrir le tableau de suivi" },
  { value: "CREATE_ADMIN_REQUEST", label: "Créer une demande" },
  { value: "CREATE_RISK", label: "Créer un risque" },
  { value: "SEND_REMINDER", label: "Envoyer un rappel" },
  { value: "CHANGE_STATUS", label: "Modifier le statut" },
  { value: "REQUEST_VALIDATION", label: "Demander une validation" },
  { value: "GENERATE_REPORT", label: "Générer un rapport" },
];

const emptyStep = () => ({
  nom: "",
  action: "VERIFY_RESOURCES" as const,
  conditions: [],
});

export function PlaybookFormDialog({ projects, users }: { projects: Option[]; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const [stepActions, setStepActions] = useState<string[]>(["VERIFY_RESOURCES"]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePlaybookInput>({
    resolver: zodResolver(createPlaybookSchema),
    defaultValues: { trigger: "PROJECT_STATUS_CHANGED", steps: [emptyStep()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "steps" });
  const { run: submit, isPending } = useAction(createPlaybook, {
    successMessage: "Playbook créé et activé.",
  });

  async function onSubmit(data: CreatePlaybookInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ trigger: "PROJECT_STATUS_CHANGED", steps: [emptyStep()] });
      setStepActions(["VERIFY_RESOURCES"]);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau playbook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Créer un playbook d&apos;orchestration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Un déclencheur, plusieurs actions exécutées dans l&apos;ordre — ex. « Mise en route projet » : vérifier
            ressources, vérifier risques, créer tâches, programmer réunion, ouvrir le tableau de suivi.
          </p>

          <div className="space-y-2">
            <Label>Nom du playbook</Label>
            <Input placeholder="Ex. Mise en route projet" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description (facultatif)</Label>
            <Input {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Déclencheur</Label>
              <Select
                defaultValue="PROJECT_STATUS_CHANGED"
                onValueChange={(v) => setValue("trigger", v as CreatePlaybookInput["trigger"])}
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
              <Label>Projet (facultatif — vide = global)</Label>
              <Select onValueChange={(v) => setValue("projectId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Global" />
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
          </div>

          <div className="space-y-2">
            <Label>Étapes, dans l&apos;ordre</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-sm text-muted-foreground">{index + 1}.</span>
                  <Input
                    placeholder="Nom de l'étape"
                    className="flex-1"
                    {...register(`steps.${index}.nom`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      remove(index);
                      setStepActions((prev) => prev.filter((_, i) => i !== index));
                    }}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  defaultValue="VERIFY_RESOURCES"
                  onValueChange={(v) => {
                    setValue(`steps.${index}.action`, v as CreatePlaybookInput["steps"][number]["action"]);
                    setStepActions((prev) => {
                      const next = [...prev];
                      next[index] = v;
                      return next;
                    });
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
                <AutomationActionFields
                  action={stepActions[index] ?? "VERIFY_RESOURCES"}
                  namePrefix={`steps.${index}.`}
                  register={register}
                  setValue={setValue}
                  users={users}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append(emptyStep());
                setStepActions((prev) => [...prev, "VERIFY_RESOURCES"]);
              }}
            >
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
