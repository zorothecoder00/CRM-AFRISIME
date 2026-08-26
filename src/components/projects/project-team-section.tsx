"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { addProjectMember, updateProjectMemberRole, removeProjectMember } from "@/actions/project.actions";
import {
  addProjectMemberSchema,
  PROJECT_MEMBER_ROLES,
  type AddProjectMemberInput,
} from "@/lib/validations/project.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";

type Option = { id: string; label: string };

const ROLE_LABELS: Record<string, string> = {
  CHEF_PROJET: "Chef de projet",
  MEMBRE: "Membre",
  OBSERVATEUR: "Observateur",
  COMITE_PILOTAGE: "Comité de pilotage",
  VALIDATEUR: "Validateur",
};

export type ProjectMemberRow = { id: string; userId: string; userName: string; roleOnProject: string };

/** Équipe & Gouvernance (cahier des charges Project Studio §62/§63) — sponsor/PM déjà affichés dans l'Aperçu ; ici, le reste du roster de gouvernance. */
export function ProjectTeamSection({
  projectId,
  sponsorName,
  responsableName,
  members,
  users,
  canManage,
}: {
  projectId: string;
  sponsorName: string | null;
  responsableName: string;
  members: ProjectMemberRow[];
  users: Option[];
  canManage: boolean;
}) {
  const { run: setRole } = useAction(updateProjectMemberRole, { successMessage: "Rôle mis à jour." });
  const { run: remove } = useAction(removeProjectMember, { successMessage: "Membre retiré." });

  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = users.filter((u) => !memberUserIds.has(u.id));

  const byRole = (role: string) => members.filter((m) => m.roleOnProject === role);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-xs text-muted-foreground">Sponsor</div>
            <div className="text-sm font-medium">{sponsorName ?? "Non défini"}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="px-(--card-spacing)">
            <div className="text-xs text-muted-foreground">Project Manager</div>
            <div className="text-sm font-medium">{responsableName}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Équipe projet, comité de pilotage et validateurs — un même roster, distingué par rôle.
        </p>
        {canManage && <AddMemberDialog projectId={projectId} users={availableUsers} />}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {PROJECT_MEMBER_ROLES.filter((r) => byRole(r).length > 0).map((role) => (
            <div key={role} className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground">{ROLE_LABELS[role]}</h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {byRole(role).map((m) => (
                  <Card key={m.id} size="sm">
                    <CardContent className="flex items-center justify-between px-(--card-spacing)">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{m.userName}</span>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Select value={m.roleOnProject} onValueChange={(v) => setRole({ memberId: m.id, roleOnProject: v as never })}>
                            <SelectTrigger className="h-7 w-auto text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_MEMBER_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon-sm" onClick={() => remove({ memberId: m.id })} aria-label="Retirer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemberDialog({ projectId, users }: { projectId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddProjectMemberInput>({
    resolver: zodResolver(addProjectMemberSchema),
    defaultValues: { projectId, roleOnProject: "MEMBRE" },
  });
  const { run: submit, isPending } = useAction(addProjectMember, { successMessage: "Membre ajouté." });

  async function onSubmit(data: AddProjectMemberInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, roleOnProject: "MEMBRE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={users.length === 0}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Personne</Label>
            <Select onValueChange={(v) => setValue("userId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select defaultValue="MEMBRE" onValueChange={(v) => setValue("roleOnProject", v as AddProjectMemberInput["roleOnProject"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_MEMBER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
