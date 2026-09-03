"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createWorkScheduleException, deleteWorkScheduleException } from "@/actions/user-work-schedule.actions";
import {
  createWorkScheduleExceptionSchema,
  type CreateWorkScheduleExceptionInput,
} from "@/lib/validations/user-work-schedule.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarOff } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  FLEXIBLE: "Flexible",
  TELETRAVAIL: "Télétravail",
  MISSION: "Mission",
  ABSENCE: "Absence",
};

export type WorkScheduleExceptionRow = {
  id: string;
  date: string;
  type: string;
  heureDebut: string | null;
  heureFin: string | null;
  motif: string | null;
};

/** §39 — dérogations ponctuelles à une date précise, en plus du gabarit hebdomadaire récurrent (WorkScheduleForm). */
export function WorkScheduleExceptions({ exceptions }: { exceptions: WorkScheduleExceptionRow[] }) {
  const { run: remove } = useAction(deleteWorkScheduleException, { successMessage: "Dérogation supprimée." });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="h-4 w-4" />
          Jours exceptionnels
        </CardTitle>
        <ExceptionFormDialog />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Un horaire différent (ou une journée non travaillée) pour une date précise, sans toucher à votre gabarit hebdomadaire habituel.
        </p>
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dérogation enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{new Date(e.date).toLocaleDateString("fr-FR")}</span>
                  <Badge variant="outline">{TYPE_LABELS[e.type]}</Badge>
                  {e.type !== "ABSENCE" && e.heureDebut && e.heureFin && (
                    <span className="text-muted-foreground">
                      {e.heureDebut}–{e.heureFin}
                    </span>
                  )}
                  {e.motif && <span className="text-muted-foreground">— {e.motif}</span>}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(e.id)} aria-label="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ExceptionFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateWorkScheduleExceptionInput>({
    resolver: zodResolver(createWorkScheduleExceptionSchema),
    defaultValues: { type: "ABSENCE" },
  });
  const type = useWatch({ control, name: "type" });
  const { run: submit, isPending } = useAction(createWorkScheduleException, { successMessage: "Dérogation ajoutée." });

  async function onSubmit(data: CreateWorkScheduleExceptionInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ type: "ABSENCE" });
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        Nouvelle dérogation
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      <div className="space-y-1">
        <Label htmlFor="exc-date" className="text-xs">
          Date
        </Label>
        <Input id="exc-date" type="date" className="w-36" {...register("date")} />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select defaultValue="ABSENCE" onValueChange={(v) => setValue("type", v as CreateWorkScheduleExceptionInput["type"])}>
          <SelectTrigger className="w-36">
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
      {type !== "ABSENCE" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="exc-debut" className="text-xs">
              Début
            </Label>
            <Input id="exc-debut" type="time" className="w-28" {...register("heureDebut")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="exc-fin" className="text-xs">
              Fin
            </Label>
            <Input id="exc-fin" type="time" className="w-28" {...register("heureFin")} />
          </div>
          {errors.heureDebut && <p className="w-full text-xs text-destructive">{errors.heureDebut.message}</p>}
        </>
      )}
      <div className="space-y-1">
        <Label htmlFor="exc-motif" className="text-xs">
          Motif (optionnel)
        </Label>
        <Input id="exc-motif" className="w-48" placeholder="Ex : RDV médical" {...register("motif")} />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Ajout..." : "Ajouter"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Annuler
      </Button>
    </form>
  );
}
