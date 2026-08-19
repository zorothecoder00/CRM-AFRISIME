"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { upsertExchangeRate } from "@/actions/exchange-rate.actions";
import { upsertExchangeRateSchema, type UpsertExchangeRateInput } from "@/lib/validations/exchange-rate.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

/**
 * Un seul sens (from -> to) est saisi ; l'inverse est calculé à la volée
 * par convertMontant() (src/lib/exchange-rates.ts), pas dupliqué ici.
 */
export function ExchangeRateFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertExchangeRateInput>({ resolver: zodResolver(upsertExchangeRateSchema) });
  const { run: submit, isPending } = useAction(upsertExchangeRate, { successMessage: "Taux enregistré." });

  async function onSubmit(data: UpsertExchangeRateInput) {
    const result = await submit({
      fromDevise: data.fromDevise.trim().toUpperCase(),
      toDevise: data.toDevise.trim().toUpperCase(),
      taux: data.taux,
    });
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau taux
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter / mettre à jour un taux de change</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDevise">De</Label>
              <Input id="fromDevise" placeholder="Ex. FCFA" maxLength={10} {...register("fromDevise")} />
              {errors.fromDevise && <p className="text-sm text-destructive">{errors.fromDevise.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDevise">Vers</Label>
              <Input id="toDevise" placeholder="Ex. EUR" maxLength={10} {...register("toDevise")} />
              {errors.toDevise && <p className="text-sm text-destructive">{errors.toDevise.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taux">Taux (1 unité de &laquo; De &raquo; = combien de &laquo; Vers &raquo;)</Label>
            <Input id="taux" type="number" step="any" min="0" placeholder="Ex. 0.0015" {...register("taux")} />
            {errors.taux && <p className="text-sm text-destructive">{errors.taux.message}</p>}
            <p className="text-xs text-muted-foreground">
              Ré-enregistrer une paire déjà existante remplace son taux (met à jour, ne duplique pas).
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
