"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { requestTaskDateChange } from "@/actions/task.actions";
import {
  createTaskDateChangeRequestSchema,
  type CreateTaskDateChangeRequestInput,
} from "@/lib/validations/task.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarClock } from "lucide-react";

/**
 * Demande utilisateur : le responsable principal/les assignés d'une tâche
 * ne peuvent pas changer sa date de début ou son échéance directement
 * (voir TaskEditDialog) — seulement en demander une nouvelle, avec un motif,
 * soumise au responsable principal (ou à un manager si c'est déjà lui qui
 * demande — voir requestTaskDateChange/decideTaskDateChange).
 */
export function TaskDateChangeRequestDialog({
  taskId,
  currentDateDebut,
  currentEcheance,
  // Demande utilisateur — pré-remplit la date suggérée (ex. prochain
  // créneau réellement libre trouvé par ScheduleTaskDialog) plutôt que la
  // date actuelle, pour appuyer directement la demande sur cette proposition.
  suggestedDateDebut,
  trigger,
}: {
  taskId: string;
  currentDateDebut?: string | null;
  currentEcheance?: string | null;
  suggestedDateDebut?: string | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskDateChangeRequestInput>({
    resolver: zodResolver(createTaskDateChangeRequestSchema),
    defaultValues: { taskId },
  });
  const { run: submit, isPending } = useAction(requestTaskDateChange, { successMessage: "Demande envoyée." });

  async function onSubmit(data: CreateTaskDateChangeRequestInput) {
    const result = await submit({ ...data, taskId });
    if (result.ok) {
      reset({ taskId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            Demander un report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander un report de date</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Indiquez la (ou les) date(s) que vous souhaiteriez, en fonction de votre emploi du temps — votre
            responsable devra valider avant que la tâche soit réellement déplacée.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dc-dateDebut">Nouvelle date de début</Label>
              <Input
                id="dc-dateDebut"
                type="date"
                defaultValue={
                  suggestedDateDebut
                    ? suggestedDateDebut.slice(0, 10)
                    : currentDateDebut
                      ? currentDateDebut.slice(0, 10)
                      : ""
                }
                {...register("requestedDateDebut")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc-echeance">Nouvelle échéance</Label>
              <Input
                id="dc-echeance"
                type="date"
                defaultValue={currentEcheance ? currentEcheance.slice(0, 10) : ""}
                {...register("requestedEcheance")}
              />
            </div>
          </div>
          {errors.requestedEcheance && <p className="text-sm text-destructive">{errors.requestedEcheance.message}</p>}

          <div className="space-y-2">
            <Label htmlFor="dc-motif">Motif</Label>
            <Textarea id="dc-motif" placeholder="Pourquoi souhaitez-vous décaler cette date ?" {...register("motif")} />
            {errors.motif && <p className="text-sm text-destructive">{errors.motif.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
