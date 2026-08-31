"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAuditPlan, updateAuditPlan } from "@/actions/audit.actions";
import {
  createAuditPlanSchema,
  updateAuditPlanSchema,
  type CreateAuditPlanInput,
  type UpdateAuditPlanInput,
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
import { Plus, Pencil } from "lucide-react";

export type AuditPlanFormValues = {
  id: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  perimetre: string | null;
  objectifs: string | null;
  criteres: string | null;
};

export function AuditPlanFormDialog({ plan }: { plan?: AuditPlanFormValues }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!plan;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAuditPlanInput | UpdateAuditPlanInput>({
    resolver: zodResolver(isEdit ? updateAuditPlanSchema : createAuditPlanSchema),
    defaultValues: plan
      ? {
          planId: plan.id,
          titre: plan.titre,
          dateDebut: plan.dateDebut.slice(0, 10),
          dateFin: plan.dateFin.slice(0, 10),
          perimetre: plan.perimetre ?? undefined,
          objectifs: plan.objectifs ?? undefined,
          criteres: plan.criteres ?? undefined,
        }
      : undefined,
  });
  const { run: create, isPending: creating } = useAction(createAuditPlan, { successMessage: "Plan d'audit créé." });
  const { run: update, isPending: updating } = useAction(updateAuditPlan, { successMessage: "Plan d'audit mis à jour." });
  const isPending = creating || updating;

  async function onSubmit(data: CreateAuditPlanInput | UpdateAuditPlanInput) {
    const result = isEdit
      ? await update(data as UpdateAuditPlanInput)
      : await create(data as CreateAuditPlanInput);
    if (result.ok) {
      if (!isEdit) reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau plan d&apos;audit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le plan d'audit" : "Créer un plan d'audit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Du</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Au</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="perimetre">Périmètre</Label>
            <Textarea id="perimetre" placeholder="Ex : Processus achats, Département Finance..." {...register("perimetre")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objectifs">Objectifs</Label>
            <Textarea id="objectifs" {...register("objectifs")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteres">Critères d&apos;audit</Label>
            <Textarea id="criteres" placeholder="Ex : Procédures internes, normes ISO..." {...register("criteres")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le plan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
