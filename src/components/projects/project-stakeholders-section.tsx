"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createStakeholder,
  linkStakeholderToProject,
  unlinkStakeholderFromProject,
} from "@/actions/stakeholder.actions";
import { createStakeholderSchema, type CreateStakeholderInput } from "@/lib/validations/stakeholder.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForNiveau } from "@/lib/status-tone";
import { StakeholderMatrix } from "@/components/stakeholders/stakeholder-matrix";
import { Plus, Trash2, Users as UsersIcon, Link2 } from "lucide-react";

type Option = { id: string; label: string };

export type StakeholderRow = {
  linkId: string;
  stakeholderId: string;
  nom: string;
  role: string | null;
  influence: string;
  interet: string;
  niveauEngagement: string;
  userName: string | null;
  contactName: string | null;
};

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

/**
 * V2.2 §21 — les parties prenantes sont désormais un profil unique
 * réutilisable sur plusieurs projets (voir /parties-prenantes) : ce bloc
 * permet de lier un profil existant ou d'en créer un nouveau lié
 * immédiatement à ce projet, plutôt qu'une création 1-projet-1-ligne.
 */
export function ProjectStakeholdersSection({
  projectId,
  stakeholders,
  users,
  contacts,
  availableStakeholders,
  canManage,
}: {
  projectId: string;
  stakeholders: StakeholderRow[];
  users: Option[];
  contacts: Option[];
  /** Parties prenantes existantes non encore liées à ce projet. */
  availableStakeholders: Option[];
  canManage: boolean;
}) {
  const { run: unlink } = useAction(unlinkStakeholderFromProject, { successMessage: "Partie prenante retirée du projet." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Acteurs concernés par le projet sans forcément faire partie de l&apos;équipe (sponsor, direction, client...).
        </p>
        {canManage && (
          <div className="flex gap-2">
            <LinkExistingStakeholderDialog projectId={projectId} availableStakeholders={availableStakeholders} />
            <StakeholderFormDialog projectId={projectId} users={users} contacts={contacts} />
          </div>
        )}
      </div>

      {stakeholders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune partie prenante renseignée.</p>
      ) : (
        <div className="space-y-3">
          <StakeholderMatrix
            stakeholders={stakeholders.map((s) => ({ id: s.stakeholderId, nom: s.nom, influence: s.influence, interet: s.interet }))}
          />
          {stakeholders.map((s) => (
            <Card key={s.linkId} size="sm">
              <CardContent className="flex flex-wrap items-start justify-between gap-2 px-(--card-spacing)">
                <div className="flex items-start gap-2">
                  <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <Link href={`/parties-prenantes/${s.stakeholderId}`} className="text-sm font-medium hover:underline">
                      {s.nom}
                      {s.role && <span className="ml-1.5 font-normal text-muted-foreground">— {s.role}</span>}
                    </Link>
                    {(s.userName || s.contactName) && (
                      <div className="text-xs text-muted-foreground">
                        {s.userName ? `Collaborateur : ${s.userName}` : `Contact externe : ${s.contactName}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={toneForNiveau(s.influence)}>Influence : {NIVEAU_LABELS[s.influence]}</Badge>
                  <Badge variant={toneForNiveau(s.interet)}>Intérêt : {NIVEAU_LABELS[s.interet]}</Badge>
                  <Badge variant={toneForNiveau(s.niveauEngagement)}>Engagement : {NIVEAU_LABELS[s.niveauEngagement]}</Badge>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => unlink({ stakeholderProjectId: s.linkId })}
                      aria-label="Retirer du projet"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkExistingStakeholderDialog({
  projectId,
  availableStakeholders,
}: {
  projectId: string;
  availableStakeholders: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [stakeholderId, setStakeholderId] = useState("");
  const [role, setRole] = useState("");
  const { run, isPending } = useAction(linkStakeholderToProject, { successMessage: "Partie prenante liée." });

  async function handleLink() {
    if (!stakeholderId) return;
    const result = await run({ stakeholderId, projectId, role: role.trim() || undefined });
    if (result.ok) {
      setStakeholderId("");
      setRole("");
      setOpen(false);
    }
  }

  if (availableStakeholders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="mr-1 h-4 w-4" />
          Lier une partie prenante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lier une partie prenante existante</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Partie prenante</Label>
            <Select value={stakeholderId} onValueChange={setStakeholderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {availableStakeholders.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-link">Rôle sur ce projet</Label>
            <Input id="role-link" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <Button className="w-full" disabled={isPending || !stakeholderId} onClick={handleLink}>
            Lier au projet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StakeholderFormDialog({
  projectId,
  users,
  contacts,
}: {
  projectId: string;
  users: Option[];
  contacts: Option[];
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateStakeholderInput>({
    resolver: zodResolver(createStakeholderSchema),
    defaultValues: { projectId, influence: "MOYEN", interet: "MOYEN", niveauEngagement: "MOYEN" },
  });
  const { run: submit, isPending } = useAction(createStakeholder, { successMessage: "Partie prenante créée." });

  async function onSubmit(data: CreateStakeholderInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, influence: "MOYEN", interet: "MOYEN", niveauEngagement: "MOYEN", nom: "", role: "", notes: "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle partie prenante
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une partie prenante</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Direction Générale" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle sur ce projet</Label>
            <Input id="role" placeholder="Ex. Arbitre budget" {...register("role")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Collaborateur lié (optionnel)</Label>
              <Select onValueChange={(v) => setValue("userId", v)}>
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
              <Select onValueChange={(v) => setValue("contactId", v)}>
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
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("influence", v as CreateStakeholderInput["influence"])}>
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
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("interet", v as CreateStakeholderInput["interet"])}>
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
                defaultValue="MOYEN"
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Créer et lier au projet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
