"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAdminRequest } from "@/actions/admin-request.actions";
import { createAdminRequestSchema, type CreateAdminRequestInput } from "@/lib/validations/admin-request.schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  MISSION: "Mission",
  DECAISSEMENT: "Décaissement",
  MATERIEL: "Matériel",
  AUTORISATION: "Autorisation",
  RECRUTEMENT: "Recrutement",
  AUTRE: "Autre",
};

type Option = { id: string; label: string };

export function AdminRequestFormDialog({ departments }: { departments: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAdminRequestInput>({
    resolver: zodResolver(createAdminRequestSchema),
    defaultValues: { type: "ACHAT" },
  });
  const { run: submit, isPending } = useAction(createAdminRequest, {
    successMessage: "Demande soumise pour validation.",
  });

  async function onSubmit(data: CreateAdminRequestInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle demande administrative</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue="ACHAT"
                onValueChange={(v) => setValue("type", v as CreateAdminRequestInput["type"])}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Département concerné</Label>
              <Select onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" placeholder="Ex : Achat de 3 ordinateurs portables" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / motif</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant estimé</Label>
              <Input id="montant" type="number" step="0.01" {...register("montant")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Envoi..." : "Soumettre la demande"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
