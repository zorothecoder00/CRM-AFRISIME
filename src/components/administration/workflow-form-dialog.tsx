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

export function WorkflowFormDialog({ roles }: { roles: { key: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
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
      steps: [{ approverRole: "" as CreateValidationWorkflowInput["steps"][number]["approverRole"], label: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "steps" });
  const { run: submit, isPending } = useAction(createValidationWorkflow, {
    successMessage: "Circuit de validation créé et activé.",
  });

  async function onSubmit(data: CreateValidationWorkflowInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({
        nom: "",
        entityType: "TASK",
        steps: [{ approverRole: "" as CreateValidationWorkflowInput["steps"][number]["approverRole"], label: "" }],
      });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un circuit de validation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ex: Demande → Responsable → Directeur → DG → Validation finale. La création active
            immédiatement ce circuit pour les tâches et désactive l&apos;ancien.
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
              onValueChange={(v) => setValue("entityType", v as CreateValidationWorkflowInput["entityType"])}
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

          <div className="space-y-2">
            <Label>Étapes, dans l&apos;ordre</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
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
            ))}
            {errors.steps && (
              <p className="text-sm text-destructive">{errors.steps.message ?? errors.steps.root?.message}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ approverRole: "" as CreateValidationWorkflowInput["steps"][number]["approverRole"], label: "" })}
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
