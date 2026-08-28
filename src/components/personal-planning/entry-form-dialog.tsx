"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createPersonalPlanningEntry } from "@/actions/personal-planning.actions";
import {
  createPersonalPlanningEntrySchema,
  type CreatePersonalPlanningEntryInput,
} from "@/lib/validations/personal-planning.schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PersonalPlanningEntryFields, type PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_VALUES: Partial<CreatePersonalPlanningEntryInput> = {
  type: "NOTE",
  priorite: "NORMALE",
  repetition: "AUCUNE",
  rappels: [],
  participantIds: [],
  etiquettes: [],
  piecesJointes: [],
};

/** Création d'une activité de planning personnel (§9), privée par défaut. */
export function PersonalPlanningEntryFormDialog({ refData }: { refData: PersonalPlanningReferenceData }) {
  const [open, setOpen] = useState(false);
  const form = useForm<CreatePersonalPlanningEntryInput>({
    resolver: zodResolver(createPersonalPlanningEntrySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { handleSubmit, reset } = form;
  const { run: submit, isPending } = useAction(createPersonalPlanningEntry, {
    successMessage: (result) =>
      result.occurrencesCreated > 1 ? `${result.occurrencesCreated} occurrences ajoutées.` : "Entrée ajoutée.",
  });

  async function onSubmit(data: CreatePersonalPlanningEntryInput) {
    const result = await submit(data);
    if (result.ok) {
      // §39/§41/§42 — avertissements de planification, jamais bloquants.
      result.data.warnings.forEach((w) => toast.warning(w));
      reset(DEFAULT_VALUES);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle activité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle activité de planning personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PersonalPlanningEntryFields form={form} refData={refData} idPrefix="new" />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
