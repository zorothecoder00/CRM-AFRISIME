"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createAvailabilityRequest, getUserAvailability } from "@/actions/personal-planning.actions";
import {
  createAvailabilityRequestSchema,
  type CreateAvailabilityRequestInput,
} from "@/lib/validations/personal-planning.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarSearch } from "lucide-react";

type Option = { id: string; label: string };
type BusyBlock = { dateDebut: string; dateFin: string; source: "personnel" | "reunion" | "conge" };

const SOURCE_LABEL: Record<BusyBlock["source"], string> = {
  personnel: "Occupé",
  reunion: "Réunion",
  conge: "Congé",
};

/** Consulte la disponibilité (occupé/libre uniquement, jamais le détail) d'un collègue puis propose un créneau. */
export function RequestAvailabilityDialog({ colleagues }: { colleagues: Option[] }) {
  const [open, setOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [busy, setBusy] = useState<BusyBlock[] | null>(null);
  const { run: fetchAvailability, isPending: isChecking } = useAction(getUserAvailability);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CreateAvailabilityRequestInput>({ resolver: zodResolver(createAvailabilityRequestSchema) });
  const { run: submit, isPending } = useAction(createAvailabilityRequest, { successMessage: "Demande envoyée." });

  async function handleCheckAvailability() {
    // getValues() (pas watch()) : lecture ponctuelle hors rendu, dans un
    // handler — pas d'abonnement reactif necessaire ici, et getValues()
    // n'est pas sur la liste des API jugees incompatibles par React Compiler.
    const dateDebut = getValues("dateDebut");
    const dateFin = getValues("dateFin");
    if (!targetUserId || !dateDebut || !dateFin) return;
    const result = await fetchAvailability({ userId: targetUserId, dateDebut, dateFin });
    if (result.ok) setBusy(result.data);
  }

  async function onSubmit(data: CreateAvailabilityRequestInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setTargetUserId("");
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarSearch className="mr-1 h-4 w-4" />
          Demander un créneau
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander un créneau à un collègue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Collègue</Label>
            <Select
              onValueChange={(v) => {
                setTargetUserId(v);
                setValue("targetUserId", v);
                setBusy(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un collègue" />
              </SelectTrigger>
              <SelectContent>
                {colleagues.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetUserId && <p className="text-sm text-destructive">{errors.targetUserId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="req-dateDebut">Début souhaité</Label>
              <Input id="req-dateDebut" type="datetime-local" {...register("dateDebut")} />
              {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-dateFin">Fin souhaitée</Label>
              <Input id="req-dateFin" type="datetime-local" {...register("dateFin")} />
              {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCheckAvailability}
            disabled={!targetUserId || isChecking}
          >
            {isChecking ? "Vérification..." : "Vérifier sa disponibilité sur cette période"}
          </Button>

          {busy && (
            <div className="rounded-md border p-2 text-xs">
              {busy.length === 0 ? (
                <p className="text-success">Aucun créneau occupé trouvé sur cette période.</p>
              ) : (
                <>
                  <p className="mb-1 text-muted-foreground">Déjà occupé sur cette période :</p>
                  <ul className="space-y-0.5">
                    {busy.map((b, i) => (
                      <li key={i}>
                        {SOURCE_LABEL[b.source]} ·{" "}
                        {new Date(b.dateDebut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        {b.source !== "reunion" &&
                          ` → ${new Date(b.dateFin).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="req-titre">Objet</Label>
            <Input id="req-titre" placeholder="Ex. Point projet" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-message">Message (optionnel)</Label>
            <Textarea id="req-message" {...register("message")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !targetUserId}>
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
