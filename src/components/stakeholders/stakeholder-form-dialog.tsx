"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createStakeholder, updateStakeholder } from "@/actions/stakeholder.actions";
import { createStakeholderSchema, type CreateStakeholderInput } from "@/lib/validations/stakeholder.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };

type StakeholderEdit = {
  id: string;
  nom: string;
  userId: string | null;
  contactId: string | null;
  influence: string;
  interet: string;
  niveauEngagement: string;
  position: string | null;
  relation: string | null;
  categorie: string | null;
  organisation: string | null;
  attentes: string | null;
  strategieEngagement: string | null;
  responsableId: string | null;
  risquesRelationnels: string | null;
  notes: string | null;
};

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const POSITION_LABELS: Record<string, string> = { FAVORABLE: "Favorable", NEUTRE: "Neutre", OPPOSANT: "Opposant" };

/** Création/édition d'un profil partie prenante (cahier des charges V2.2 §21). */
export function StakeholderFormDialog({
  users,
  contacts,
  stakeholder,
}: {
  users: Option[];
  contacts: Option[];
  /** Présent = mode édition. Absent = création (autonome, sans lien projet). */
  stakeholder?: StakeholderEdit;
}) {
  const isEdit = !!stakeholder;
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateStakeholderInput>({
    resolver: zodResolver(createStakeholderSchema),
    defaultValues: stakeholder
      ? {
          nom: stakeholder.nom,
          userId: stakeholder.userId ?? undefined,
          contactId: stakeholder.contactId ?? undefined,
          influence: stakeholder.influence as CreateStakeholderInput["influence"],
          interet: stakeholder.interet as CreateStakeholderInput["interet"],
          niveauEngagement: stakeholder.niveauEngagement as CreateStakeholderInput["niveauEngagement"],
          position: (stakeholder.position ?? undefined) as CreateStakeholderInput["position"],
          relation: stakeholder.relation ?? "",
          categorie: stakeholder.categorie ?? "",
          organisation: stakeholder.organisation ?? "",
          attentes: stakeholder.attentes ?? "",
          strategieEngagement: stakeholder.strategieEngagement ?? "",
          responsableId: stakeholder.responsableId ?? undefined,
          risquesRelationnels: stakeholder.risquesRelationnels ?? "",
          notes: stakeholder.notes ?? "",
        }
      : { influence: "MOYEN", interet: "MOYEN", niveauEngagement: "MOYEN" },
  });
  const { run: createRun, isPending: isCreating } = useAction(createStakeholder, { successMessage: "Partie prenante créée." });
  const { run: updateRun, isPending: isUpdating } = useAction(updateStakeholder, {
    successMessage: "Partie prenante mise à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateStakeholderInput) {
    const result = isEdit ? await updateRun({ ...data, id: stakeholder.id }) : await createRun(data);
    if (result.ok) {
      reset({
        influence: "MOYEN",
        interet: "MOYEN",
        niveauEngagement: "MOYEN",
        nom: "",
        relation: "",
        categorie: "",
        organisation: "",
        attentes: "",
        strategieEngagement: "",
        risquesRelationnels: "",
        notes: "",
      });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nouvelle partie prenante
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la partie prenante" : "Créer une partie prenante"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Direction Générale" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Collaborateur lié (optionnel)</Label>
              <Select defaultValue={stakeholder?.userId ?? undefined} onValueChange={(v) => setValue("userId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact externe lié (optionnel)</Label>
              <Select defaultValue={stakeholder?.contactId ?? undefined} onValueChange={(v) => setValue("contactId", v)}>
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Influence</Label>
              <Select
                defaultValue={stakeholder?.influence ?? "MOYEN"}
                onValueChange={(v) => setValue("influence", v as CreateStakeholderInput["influence"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEAU_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intérêt</Label>
              <Select
                defaultValue={stakeholder?.interet ?? "MOYEN"}
                onValueChange={(v) => setValue("interet", v as CreateStakeholderInput["interet"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEAU_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Engagement</Label>
              <Select
                defaultValue={stakeholder?.niveauEngagement ?? "MOYEN"}
                onValueChange={(v) => setValue("niveauEngagement", v as CreateStakeholderInput["niveauEngagement"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NIVEAU_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                defaultValue={stakeholder?.position ?? undefined}
                onValueChange={(v) => setValue("position", v as CreateStakeholderInput["position"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non renseignée" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable interne</Label>
              <Select defaultValue={stakeholder?.responsableId ?? undefined} onValueChange={(v) => setValue("responsableId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relation">Nature de la relation</Label>
            <Input id="relation" placeholder="Ex. Client historique, sponsor politique..." {...register("relation")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input id="categorie" placeholder="Ex. Institution, bailleur..." {...register("categorie")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organisation">Organisation</Label>
              <Input id="organisation" {...register("organisation")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attentes">Attentes</Label>
            <Textarea id="attentes" {...register("attentes")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategieEngagement">Stratégie d&apos;engagement</Label>
            <Textarea id="strategieEngagement" {...register("strategieEngagement")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risquesRelationnels">Risques relationnels</Label>
            <Textarea id="risquesRelationnels" {...register("risquesRelationnels")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
