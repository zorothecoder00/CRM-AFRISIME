"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { updateUser } from "@/actions/user.actions";
import { updateUserSchema, type UpdateUserInput } from "@/lib/validations/user.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";

type Option = { id: string; label: string };

export type EditableUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  departmentId: string | null;
  poste: string | null;
  posteId: string | null;
  siteId: string | null;
  managerId: string | null;
};

export function EditUserDialog({
  user,
  roles,
  departments,
  postes,
  sites,
  managers,
}: {
  user: EditableUser;
  roles: Option[];
  departments: Option[];
  postes: Option[];
  sites: Option[];
  /** Ne propose jamais l'utilisateur lui-même comme manager. */
  managers: Option[];
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      departmentId: user.departmentId ?? undefined,
      poste: user.poste ?? undefined,
      posteId: user.posteId ?? undefined,
      siteId: user.siteId ?? undefined,
      managerId: user.managerId ?? undefined,
    },
  });
  const { run: submit, isPending } = useAction(updateUser, { successMessage: "Utilisateur mis à jour." });

  async function onSubmit(data: UpdateUserInput) {
    const result = await submit(data);
    if (result.ok) setOpen(false);
  }

  const managerOptions = managers.filter((m) => m.id !== user.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {user.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select defaultValue={user.roleId} onValueChange={(v) => setValue("roleId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="poste">Poste / fonction (libellé libre)</Label>
            <Input id="poste" {...register("poste")} />
          </div>
          <div className="space-y-2">
            <Label>Poste structuré (optionnel)</Label>
            <Select defaultValue={user.posteId ?? undefined} onValueChange={(v) => setValue("posteId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                {postes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Département</Label>
              <Select defaultValue={user.departmentId ?? undefined} onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Site / agence</Label>
              <Select defaultValue={user.siteId ?? undefined} onValueChange={(v) => setValue("siteId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Manager (rattachement hiérarchique)</Label>
            <Select defaultValue={user.managerId ?? undefined} onValueChange={(v) => setValue("managerId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.managerId && <p className="text-sm text-destructive">{errors.managerId.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
