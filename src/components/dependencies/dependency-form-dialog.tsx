"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createDependency } from "@/actions/dependency.actions";
import {
  createDependencySchema,
  DEPENDENCY_ENTITY_TYPES,
  type CreateDependencyInput,
} from "@/lib/validations/dependency.schema";
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
type EntityType = (typeof DEPENDENCY_ENTITY_TYPES)[number];

const TYPE_LABELS: Record<EntityType, string> = {
  Project: "Projet",
  Team: "Équipe",
  User: "Personne",
  Processus: "Processus",
  MeetingDecision: "Décision (réunion)",
  GovernanceDecision: "Décision (gouvernance)",
  ProjectResource: "Ressource",
  CrmOrganization: "Partenaire",
  CrmContact: "Prestataire",
  Transformation: "Transformation",
};

export function DependencyFormDialog({
  optionsByType,
  defaultSourceType,
  defaultSourceId,
}: {
  optionsByType: Record<EntityType, Option[]>;
  defaultSourceType?: EntityType;
  defaultSourceId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<EntityType>(defaultSourceType ?? "Project");
  const [targetType, setTargetType] = useState<EntityType>("Project");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateDependencyInput>({
    resolver: zodResolver(createDependencySchema),
    defaultValues: {
      sourceType: defaultSourceType ?? "Project",
      sourceId: defaultSourceId,
      targetType: "Project",
      type: "BLOQUE",
    },
  });
  const { run: submit, isPending } = useAction(createDependency, { successMessage: "Dépendance créée." });

  const sourceOptions = useMemo(() => optionsByType[sourceType] ?? [], [optionsByType, sourceType]);
  const targetOptions = useMemo(() => optionsByType[targetType] ?? [], [optionsByType, targetType]);

  async function onSubmit(data: CreateDependencyInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({
        sourceType: defaultSourceType ?? "Project",
        sourceId: defaultSourceId ?? "",
        targetType: "Project",
        targetId: "",
        type: "BLOQUE",
        notes: "",
      });
      setSourceType(defaultSourceType ?? "Project");
      setTargetType("Project");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle dépendance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une dépendance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            « Source » dépend de « Cible » — ex. Projet A dépend de Projet B : un retard de B peut alerter sur A.
          </p>

          <div className="space-y-2 rounded-md border p-3">
            <Label>Source (dépend de la cible)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                defaultValue={sourceType}
                onValueChange={(v) => {
                  const next = v as EntityType;
                  setSourceType(next);
                  setValue("sourceType", next);
                  setValue("sourceId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPENDENCY_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={defaultSourceId}
                onValueChange={(v) => setValue("sourceId", v)}
                disabled={!!defaultSourceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.sourceId && <p className="text-sm text-destructive">{errors.sourceId.message}</p>}
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Label>Cible (dont la source dépend)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                defaultValue={targetType}
                onValueChange={(v) => {
                  const next = v as EntityType;
                  setTargetType(next);
                  setValue("targetType", next);
                  setValue("targetId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPENDENCY_ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => setValue("targetId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.targetId && <p className="text-sm text-destructive">{errors.targetId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type de dépendance</Label>
            <Select defaultValue="BLOQUE" onValueChange={(v) => setValue("type", v as CreateDependencyInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOQUE">Bloquant</SelectItem>
                <SelectItem value="LIE_A">Lié à</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (facultatif)</Label>
            <Input {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la dépendance"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
