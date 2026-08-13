"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createContact } from "@/actions/crm.actions";
import { createContactSchema, type CreateContactInput } from "@/lib/validations/crm.schema";
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
  CLIENT: "Client",
  PROSPECT: "Prospect",
  PARTENAIRE: "Partenaire",
  FOURNISSEUR: "Fournisseur",
  CONSULTANT: "Consultant",
  PRESTATAIRE: "Prestataire",
  CANDIDAT: "Candidat",
  MEMBRE: "Membre",
  INVESTISSEUR: "Investisseur",
  AUTRE: "Autre",
};

type Option = { id: string; label: string };

export function ContactFormDialog({
  organizations,
  defaultOrganizationId,
}: {
  organizations: Option[];
  /** Pré-sélectionne l'organisation quand le dialogue s'ouvre depuis sa fiche. */
  defaultOrganizationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { type: "PROSPECT", organizationId: defaultOrganizationId },
  });
  const { run: submit, isPending } = useAction(createContact, {
    successMessage: "Contact créé avec succès.",
  });

  async function onSubmit(data: CreateContactInput) {
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
          Nouveau contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" {...register("prenom")} />
              {errors.prenom && <p className="text-sm text-destructive">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" {...register("nom")} />
              {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" {...register("telephone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue="PROSPECT"
                onValueChange={(v) => setValue("type", v as CreateContactInput["type"])}
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
              <Label htmlFor="fonction">Fonction</Label>
              <Input id="fonction" {...register("fonction")} />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" placeholder="Ex : salon, recommandation, site web..." {...register("source")} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input id="score" type="number" min={0} max={100} {...register("score", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Input id="segment" placeholder="Ex : PME, grand compte..." {...register("segment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prochaineRelance">Prochaine relance</Label>
              <Input id="prochaineRelance" type="date" {...register("prochaineRelance")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
