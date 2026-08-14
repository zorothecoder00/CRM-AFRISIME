"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createInstance } from "@/actions/gouvernance.actions";
import { createInstanceSchema, type CreateInstanceInput } from "@/lib/validations/gouvernance.schema";
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
import { Plus } from "lucide-react";

export const INSTANCE_TYPE_LABELS: Record<string, string> = {
  CONSEIL_ADMINISTRATION: "Conseil d'administration",
  COMITE_DIRECTION: "Comité de direction",
  COMITE_PILOTAGE: "Comité de pilotage",
  COMITE_TECHNIQUE: "Comité technique",
  COMMISSION: "Commission",
  GROUPE_TRAVAIL: "Groupe de travail",
  COMITE_AD_HOC: "Comité ad hoc",
  AUTRE: "Autre",
};

export function InstanceFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInstanceInput>({
    resolver: zodResolver(createInstanceSchema),
    defaultValues: { type: "AUTRE" },
  });
  const { run: submit, isPending } = useAction(createInstance, { successMessage: "Instance créée." });

  async function onSubmit(data: CreateInstanceInput) {
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
          Nouvelle instance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une instance de gouvernance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex : Conseil d'administration" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              defaultValue="AUTRE"
              onValueChange={(v) => setValue("type", v as CreateInstanceInput["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSTANCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
