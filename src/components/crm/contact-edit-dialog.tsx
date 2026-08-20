"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateContact } from "@/actions/crm.actions";
import { updateContactSchema, type UpdateContactInput } from "@/lib/validations/crm.schema";
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
import { Pencil } from "lucide-react";

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
  COMMUNAUTE: "Communauté",
  AUTRE: "Autre",
};

type Option = { id: string; label: string };

export type ContactEditData = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  fonction: string | null;
  type: UpdateContactInput["type"];
  source: string | null;
  organizationId: string | null;
  notes: string | null;
  ownerId: string | null;
  score: number | null;
  segment: string | null;
  /** Date au format yyyy-mm-dd (input[type=date]), déjà convertie par l'appelant. */
  prochaineRelance: string | null;
};

function toDefaultValues(contact: ContactEditData): UpdateContactInput {
  return {
    id: contact.id,
    prenom: contact.prenom,
    nom: contact.nom,
    email: contact.email ?? "",
    telephone: contact.telephone ?? "",
    fonction: contact.fonction ?? "",
    type: contact.type,
    source: contact.source ?? "",
    organizationId: contact.organizationId ?? undefined,
    notes: contact.notes ?? "",
    ownerId: contact.ownerId ?? undefined,
    score: contact.score ?? undefined,
    segment: contact.segment ?? "",
    prochaineRelance: contact.prochaineRelance ?? "",
  };
}

export function ContactEditDialog({
  contact,
  organizations,
  hasPortalAccount = false,
}: {
  contact: ContactEditData;
  organizations: Option[];
  /** Ce contact a déjà un accès portail : l'email devient alors obligatoire
   * (identifiant de connexion, cf. PortalAccount.email) et se resynchronise
   * automatiquement côté serveur (updateContact) quand il change ici. */
  hasPortalAccount?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: toDefaultValues(contact),
  });
  const { run: submit, isPending } = useAction(updateContact, {
    successMessage: "Contact mis à jour avec succès.",
  });

  // Le dialogue reste monté en permanence (Dialog ne démonte pas son contenu
  // à la fermeture) : on re-synchronise le formulaire sur les données à jour
  // du contact à chaque ouverture, pour ne pas rejouer une édition périmée.
  useEffect(() => {
    if (open) reset(toDefaultValues(contact));
  }, [open, contact, reset]);

  const typeValue = watch("type");
  const organizationIdValue = watch("organizationId");

  async function onSubmit(data: UpdateContactInput) {
    if (hasPortalAccount && !data.email) {
      setError("email", {
        message: "Requis : ce contact a un accès portail actif, qui a besoin d'un email de connexion.",
      });
      return;
    }
    const result = await submit(data);
    if (result.ok) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-prenom">Prénom</Label>
              <Input id="edit-prenom" {...register("prenom")} />
              {errors.prenom && <p className="text-sm text-destructive">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nom">Nom</Label>
              <Input id="edit-nom" {...register("nom")} />
              {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email{hasPortalAccount && " *"}</Label>
              <Input id="edit-email" type="email" {...register("email")} />
              {errors.email ? (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              ) : hasPortalAccount ? (
                <p className="text-xs text-muted-foreground">
                  Accès portail actif : sert d&apos;identifiant de connexion, resynchronisé automatiquement si modifié.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telephone">Téléphone</Label>
              <Input id="edit-telephone" {...register("telephone")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={typeValue}
                onValueChange={(v) => setValue("type", v as UpdateContactInput["type"])}
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
              <Label htmlFor="edit-fonction">Fonction</Label>
              <Input id="edit-fonction" {...register("fonction")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Organisation</Label>
            <Select
              value={organizationIdValue}
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
            <Label htmlFor="edit-source">Source</Label>
            <Input id="edit-source" placeholder="Ex : salon, recommandation, site web..." {...register("source")} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-score">Score (0-100)</Label>
              <Input id="edit-score" type="number" min={0} max={100} {...register("score", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-segment">Segment</Label>
              <Input id="edit-segment" placeholder="Ex : PME, grand compte..." {...register("segment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-prochaineRelance">Prochaine relance</Label>
              <Input id="edit-prochaineRelance" type="date" {...register("prochaineRelance")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
