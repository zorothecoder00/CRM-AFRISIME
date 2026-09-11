"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createTeam, updateTeam } from "@/actions/team.actions";
import { createTeamSchema, updateTeamSchema, type CreateTeamInput, type UpdateTeamInput } from "@/lib/validations/team.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

type Option = { id: string; label: string };

/**
 * Demande utilisateur (2026-09-11) — mode édition ajouté (`team`), jusque-là
 * absent de toute l'app (updateTeam n'était utilisé que par l'éditeur
 * d'organigramme, un tout autre outil) : renommer/changer département ou
 * responsable sans passer par ce dernier. Sans `team`, comportement de
 * création inchangé. Le champ "Responsable" n'est proposé que si `users`
 * est fourni (le contexte "gérer ma propre équipe" force le responsable
 * côté serveur — voir team.actions.ts — ce champ n'a alors pas de sens).
 */
export function TeamFormDialog({
  departments,
  users,
  team,
}: {
  departments: Option[];
  users?: Option[];
  team?: { id: string; nom: string; departmentId: string; leaderId: string | null };
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!team;
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTeamInput | UpdateTeamInput>({
    resolver: zodResolver(isEdit ? updateTeamSchema : createTeamSchema),
    defaultValues: team ? { id: team.id, nom: team.nom, departmentId: team.departmentId, leaderId: team.leaderId ?? undefined } : undefined,
  });
  const { run: runCreate, isPending: isCreating } = useAction(createTeam, { successMessage: "Équipe créée." });
  const { run: runUpdate, isPending: isUpdating } = useAction(updateTeam, { successMessage: "Équipe modifiée." });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateTeamInput | UpdateTeamInput) {
    const result = isEdit ? await runUpdate(data as UpdateTeamInput) : await runCreate(data);
    if (result.ok) {
      if (!isEdit) reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier" title="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nouvelle équipe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'équipe" : "Créer une équipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" defaultValue={team?.nom} {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Département</Label>
            <Select defaultValue={team?.departmentId} onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
          </div>

          {users && (
            <div className="space-y-2">
              <Label>Responsable d&apos;équipe</Label>
              <Select defaultValue={team?.leaderId ?? undefined} onValueChange={(v) => setValue("leaderId", v)}>
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
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
