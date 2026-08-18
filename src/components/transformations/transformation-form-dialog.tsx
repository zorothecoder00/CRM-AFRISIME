"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createTransformation } from "@/actions/transformation.actions";
import { createTransformationSchema, type CreateTransformationInput } from "@/lib/validations/transformation.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

const TYPE_OPTIONS = [
  { value: "DIGITALE", label: "Transformation digitale" },
  { value: "RESTRUCTURATION", label: "Restructuration" },
  { value: "EXPANSION_GEOGRAPHIQUE", label: "Expansion géographique" },
  { value: "CHANGEMENT_ORGANISATIONNEL", label: "Changement organisationnel" },
  { value: "FUSION", label: "Fusion" },
  { value: "ACQUISITION", label: "Acquisition" },
  { value: "LANCEMENT_ACTIVITE", label: "Lancement d'activité" },
];

export function TransformationFormDialog({ departments, users }: { departments: Option[]; users: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTransformationInput>({
    resolver: zodResolver(createTransformationSchema),
    defaultValues: { type: "DIGITALE" },
  });
  const { run: submit, isPending } = useAction(createTransformation, { successMessage: "Transformation créée." });

  async function onSubmit(data: CreateTransformationInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ nom: "", type: "DIGITALE", description: "", departmentId: "", responsableId: "", dateDebut: "", dateFin: "" });
      setOpen(false);
      router.push(`/transformations/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle transformation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une transformation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input placeholder="Ex. Migration vers le cloud" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue="DIGITALE" onValueChange={(v) => setValue("type", v as CreateTransformationInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select onValueChange={(v) => setValue("responsableId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.responsableId && <p className="text-sm text-destructive">{errors.responsableId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Département concerné (facultatif — vide = organisation entière)</Label>
            <Select onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Organisation entière" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Début</Label>
              <Input type="date" {...register("dateDebut")} />
            </div>
            <div className="space-y-2">
              <Label>Fin prévue</Label>
              <Input type="date" {...register("dateFin")} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la transformation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
