"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectStakeholder, deleteProjectStakeholder } from "@/actions/project.actions";
import { createProjectStakeholderSchema, type CreateProjectStakeholderInput } from "@/lib/validations/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForNiveau } from "@/lib/status-tone";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";

type Option = { id: string; label: string };

export type StakeholderRow = {
  id: string;
  nom: string;
  role: string | null;
  influence: string;
  interet: string;
  notes: string | null;
  userName: string | null;
  contactName: string | null;
};

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

export function ProjectStakeholdersSection({
  projectId,
  stakeholders,
  users,
  contacts,
  canManage,
}: {
  projectId: string;
  stakeholders: StakeholderRow[];
  users: Option[];
  contacts: Option[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteProjectStakeholder, { successMessage: "Partie prenante retirée." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Acteurs concernés par le projet sans forcément faire partie de l&apos;équipe (sponsor, direction, client...).
        </p>
        {canManage && <StakeholderFormDialog projectId={projectId} users={users} contacts={contacts} />}
      </div>

      {stakeholders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune partie prenante renseignée.</p>
      ) : (
        <div className="space-y-2">
          {stakeholders.map((s) => (
            <Card key={s.id} size="sm">
              <CardContent className="flex flex-wrap items-start justify-between gap-2 px-(--card-spacing)">
                <div className="flex items-start gap-2">
                  <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">
                      {s.nom}
                      {s.role && <span className="ml-1.5 font-normal text-muted-foreground">— {s.role}</span>}
                    </div>
                    {(s.userName || s.contactName) && (
                      <div className="text-xs text-muted-foreground">
                        {s.userName ? `Collaborateur : ${s.userName}` : `Contact externe : ${s.contactName}`}
                      </div>
                    )}
                    {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={toneForNiveau(s.influence)}>Influence : {NIVEAU_LABELS[s.influence]}</Badge>
                  <Badge variant={toneForNiveau(s.interet)}>Intérêt : {NIVEAU_LABELS[s.interet]}</Badge>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove({ stakeholderId: s.id })}
                      aria-label="Retirer"
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
  } = useForm<CreateProjectStakeholderInput>({
    resolver: zodResolver(createProjectStakeholderSchema),
    defaultValues: { projectId, influence: "MOYEN", interet: "MOYEN" },
  });
  const { run: submit, isPending } = useAction(createProjectStakeholder, { successMessage: "Partie prenante ajoutée." });

  async function onSubmit(data: CreateProjectStakeholderInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, influence: "MOYEN", interet: "MOYEN" });
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
          <DialogTitle>Ajouter une partie prenante</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Direction Générale" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Influence</Label>
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("influence", v as CreateProjectStakeholderInput["influence"])}>
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
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("interet", v as CreateProjectStakeholderInput["interet"])}>
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
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
