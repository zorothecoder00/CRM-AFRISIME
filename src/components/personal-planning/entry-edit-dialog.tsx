"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updatePersonalPlanningEntry } from "@/actions/personal-planning.actions";
import {
  updatePersonalPlanningEntrySchema,
  type UpdatePersonalPlanningEntryInput,
} from "@/lib/validations/personal-planning.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PersonalPlanningEntryEditData = {
  id: string;
  titre: string;
  notes: string | null;
  dateDebut: string;
  dateFin: string;
  type: "NOTE" | "INDISPONIBLE";
};

/** Édition d'une entrée existante — dialogue contrôlé, ouvert depuis la grille hebdomadaire. */
export function PersonalPlanningEntryEditDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: PersonalPlanningEntryEditData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdatePersonalPlanningEntryInput>({
    resolver: zodResolver(updatePersonalPlanningEntrySchema),
    defaultValues: {
      id: entry.id,
      titre: entry.titre,
      notes: entry.notes ?? "",
      dateDebut: entry.dateDebut.slice(0, 16),
      dateFin: entry.dateFin.slice(0, 16),
      type: entry.type,
    },
  });
  const { run: submit, isPending } = useAction(updatePersonalPlanningEntry, { successMessage: "Entrée modifiée." });

  async function onSubmit(data: UpdatePersonalPlanningEntryInput) {
    const result = await submit(data);
    if (result.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;entrée</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-titre">Titre</Label>
            <Input id="edit-titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue={entry.type} onValueChange={(v) => setValue("type", v as UpdatePersonalPlanningEntryInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOTE">Note personnelle</SelectItem>
                <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dateDebut">Début</Label>
              <Input id="edit-dateDebut" type="datetime-local" {...register("dateDebut")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dateFin">Fin</Label>
              <Input id="edit-dateFin" type="datetime-local" {...register("dateFin")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" {...register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
