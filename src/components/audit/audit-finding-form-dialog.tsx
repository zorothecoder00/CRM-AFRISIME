"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAuditFinding, updateAuditFinding } from "@/actions/audit.actions";
import {
  createAuditFindingSchema,
  updateAuditFindingSchema,
  type CreateAuditFindingInput,
  type UpdateAuditFindingInput,
} from "@/lib/validations/audit.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };

const STATUT_LABELS: Record<string, string> = {
  OUVERT: "Ouvert",
  EN_COURS: "En cours",
  TRAITE: "Traité",
  CLOS: "Clos",
};

export type AuditFindingFormValues = {
  id: string;
  constat: string;
  recommandation: string | null;
  responsableId: string | null;
  echeance: string | null;
  statut: string;
};

export function AuditFindingFormDialog({
  missionId,
  finding,
  users,
}: {
  missionId: string;
  finding?: AuditFindingFormValues;
  users: Option[];
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!finding;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAuditFindingInput | UpdateAuditFindingInput>({
    resolver: zodResolver(isEdit ? updateAuditFindingSchema : createAuditFindingSchema),
    defaultValues: finding
      ? {
          findingId: finding.id,
          missionId,
          constat: finding.constat,
          recommandation: finding.recommandation ?? undefined,
          responsableId: finding.responsableId ?? undefined,
          echeance: finding.echeance ? finding.echeance.slice(0, 10) : undefined,
          statut: finding.statut as UpdateAuditFindingInput["statut"],
        }
      : { missionId },
  });
  const { run: create, isPending: creating } = useAction(createAuditFinding, { successMessage: "Constat ajouté." });
  const { run: update, isPending: updating } = useAction(updateAuditFinding, { successMessage: "Constat mis à jour." });
  const isPending = creating || updating;

  async function onSubmit(data: CreateAuditFindingInput | UpdateAuditFindingInput) {
    const result = isEdit
      ? await update({ ...data, missionId } as UpdateAuditFindingInput)
      : await create({ ...data, missionId } as CreateAuditFindingInput);
    if (result.ok) {
      if (!isEdit) reset({ missionId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un constat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le constat" : "Ajouter un constat"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="constat">Constat</Label>
            <Textarea id="constat" {...register("constat")} />
            {errors.constat && <p className="text-sm text-destructive">{errors.constat.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recommandation">Recommandation</Label>
            <Textarea id="recommandation" {...register("recommandation")} />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                defaultValue={finding?.statut}
                onValueChange={(v) => setValue("statut" as never, v as never)}
              >
                <SelectTrigger>
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
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                defaultValue={finding?.responsableId ?? undefined}
                onValueChange={(v) => setValue("responsableId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="echeance">Échéance</Label>
              <Input id="echeance" type="date" {...register("echeance")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
