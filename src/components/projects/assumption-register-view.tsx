"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAssumption, updateAssumptionStatus, deleteAssumption } from "@/actions/assumption.actions";
import { createAssumptionSchema, type CreateAssumptionInput } from "@/lib/validations/assumption.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type AssumptionRow = {
  id: string;
  hypothese: string;
  statut: "VALIDE" | "INCERTAINE" | "INVALIDEE";
  notes: string | null;
};

const STATUT_LABELS: Record<string, string> = { VALIDE: "Valide", INCERTAINE: "Incertaine", INVALIDEE: "Invalidée" };
const STATUT_TONE: Record<string, "success" | "warning" | "destructive"> = {
  VALIDE: "success",
  INCERTAINE: "warning",
  INVALIDEE: "destructive",
};

/** Assumption Register (Project Studio §29) — distinct du registre des risques. */
export function AssumptionRegisterView({
  projectId,
  assumptions,
  canManage,
}: {
  projectId: string;
  assumptions: AssumptionRow[];
  canManage: boolean;
}) {
  const { run: setStatus } = useAction(updateAssumptionStatus, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteAssumption, { successMessage: "Hypothèse supprimée." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Conditions supposées vraies pour que le projet fonctionne — distinct du registre des risques.
        </p>
        {canManage && <AssumptionFormDialog projectId={projectId} />}
      </div>

      {assumptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune hypothèse enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {assumptions.map((a) => (
            <Card key={a.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium">{a.hypothese}</p>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ assumptionId: a.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                {canManage ? (
                  <Select value={a.statut} onValueChange={(v) => setStatus({ assumptionId: a.id, statut: v as never })}>
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
                ) : (
                  <Badge variant={STATUT_TONE[a.statut]}>{STATUT_LABELS[a.statut]}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssumptionFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAssumptionInput>({
    resolver: zodResolver(createAssumptionSchema),
    defaultValues: { projectId, statut: "INCERTAINE" },
  });
  const { run: submit, isPending } = useAction(createAssumption, { successMessage: "Hypothèse ajoutée." });

  async function onSubmit(data: CreateAssumptionInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, statut: "INCERTAINE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle hypothèse
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle hypothèse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Textarea placeholder="Ex. Les bénéficiaires participeront régulièrement." {...register("hypothese")} />
          {errors.hypothese && <p className="text-sm text-destructive">{errors.hypothese.message}</p>}
          <Textarea placeholder="Notes (optionnel)" {...register("notes")} />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
