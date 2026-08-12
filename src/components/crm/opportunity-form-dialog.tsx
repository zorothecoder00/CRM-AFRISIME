"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createOpportunity } from "@/actions/crm.actions";
import { createOpportunitySchema, type CreateOpportunityInput } from "@/lib/validations/crm.schema";
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

type Option = { id: string; label: string };

export function OpportunityFormDialog({
  contacts,
  organizations,
  users,
  currentUserId,
  defaultContactId,
  defaultOrganizationId,
}: {
  contacts: Option[];
  organizations: Option[];
  users: Option[];
  currentUserId: string;
  defaultContactId?: string;
  defaultOrganizationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateOpportunityInput>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      ownerId: currentUserId,
      contactId: defaultContactId,
      organizationId: defaultOrganizationId,
    },
  });
  const { run: submit, isPending } = useAction(createOpportunity, {
    successMessage: "Opportunité créée avec succès.",
  });

  async function onSubmit(data: CreateOpportunityInput) {
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
          Nouvelle opportunité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une opportunité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex : Refonte site web — AfriSime" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select defaultValue={defaultContactId} onValueChange={(v) => setValue("contactId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Organisation</Label>
              <Select
                defaultValue={defaultOrganizationId}
                onValueChange={(v) => setValue("organizationId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montantEstime">Montant estimé</Label>
              <Input id="montantEstime" type="number" step="0.01" {...register("montantEstime")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probabilite">Probabilité (%)</Label>
              <Input
                id="probabilite"
                type="number"
                min={0}
                max={100}
                {...register("probabilite", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select defaultValue={currentUserId} onValueChange={(v) => setValue("ownerId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ownerId && <p className="text-sm text-destructive">{errors.ownerId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateClotureEstimee">Clôture estimée</Label>
              <Input id="dateClotureEstimee" type="date" {...register("dateClotureEstimee")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" {...register("source")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer l'opportunité"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
