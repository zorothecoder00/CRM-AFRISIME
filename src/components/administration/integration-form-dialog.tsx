"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createIntegration } from "@/actions/integration.actions";
import { createIntegrationSchema, type CreateIntegrationInput } from "@/lib/validations/integration.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TYPES = [
  { value: "AFRIGES", label: "AfriGes (ERP)" },
  { value: "M365", label: "Microsoft 365" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "AUTRE", label: "Autre" },
];

export function IntegrationFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateIntegrationInput>({ resolver: zodResolver(createIntegrationSchema) });
  const { run: submit, isPending } = useAction(createIntegration, { successMessage: "Intégration créée." });

  async function onSubmit(data: CreateIntegrationInput) {
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
          Nouvelle intégration
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connecter un système externe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select onValueChange={(v) => setValue("type", v as CreateIntegrationInput["type"])}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">Clé API (secret partagé pour les webhooks entrants)</Label>
            <Input id="apiKey" {...register("apiKey")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">URL de webhook sortant (optionnel, non appelée dans ce MVP)</Label>
            <Input id="webhookUrl" {...register("webhookUrl")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
