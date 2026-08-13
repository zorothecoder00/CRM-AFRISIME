"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createPermissionOverride } from "@/actions/permission-override.actions";
import {
  createPermissionOverrideSchema,
  type CreatePermissionOverrideInput,
} from "@/lib/validations/permission-override.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
type PermissionOption = { key: string; label: string; category: string };

export function PermissionOverrideFormDialog({
  users,
  permissions,
  departments,
  projects,
}: {
  users: Option[];
  permissions: PermissionOption[];
  departments: Option[];
  projects: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<CreatePermissionOverrideInput["scopeType"]>("DEPARTEMENT");
  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePermissionOverrideInput>({
    resolver: zodResolver(createPermissionOverrideSchema),
    defaultValues: { scopeType: "DEPARTEMENT", effect: "GRANT" },
  });
  const { run: submit, isPending } = useAction(createPermissionOverride, {
    successMessage: "Dérogation créée.",
  });

  async function onSubmit(data: CreatePermissionOverrideInput) {
    const result = await submit(data);
    if (result.ok) {
      reset({ scopeType: "DEPARTEMENT", effect: "GRANT" });
      setScopeType("DEPARTEMENT");
      setOpen(false);
    }
  }

  const scopeOptions = scopeType === "DEPARTEMENT" ? departments : projects;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle dérogation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une dérogation de permission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Utilisateur</Label>
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
            <Label>Permission</Label>
            <Select onValueChange={(v) => setValue("permissionKey", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {permissions.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.category} — {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.permissionKey && <p className="text-sm text-destructive">{errors.permissionKey.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Effet</Label>
            <Select
              defaultValue="GRANT"
              onValueChange={(v) => setValue("effect", v as CreatePermissionOverrideInput["effect"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRANT">Accorder (au-delà du rôle)</SelectItem>
                <SelectItem value="DENY">Refuser (l&apos;emporte toujours)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Portée</Label>
            <Select
              defaultValue="DEPARTEMENT"
              onValueChange={(v) => {
                const next = v as CreatePermissionOverrideInput["scopeType"];
                setScopeType(next);
                setValue("scopeType", next);
                setValue("scopeId", "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPARTEMENT">Département</SelectItem>
                <SelectItem value="PROJET">Projet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{scopeType === "DEPARTEMENT" ? "Département" : "Projet"}</Label>
            <Select onValueChange={(v) => setValue("scopeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.scopeId && <p className="text-sm text-destructive">{errors.scopeId.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la dérogation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
