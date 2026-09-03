"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { convertProjectIdeaToProject } from "@/actions/project-idea.actions";
import { convertProjectIdeaSchema, type ConvertProjectIdeaInput } from "@/lib/validations/project-idea.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket } from "lucide-react";

type Option = { id: string; label: string };

export function ConvertIdeaDialog({
  ideaId,
  users,
  departments,
  defaultResponsableId,
  defaultDepartmentId,
}: {
  ideaId: string;
  users: Option[];
  departments: Option[];
  defaultResponsableId?: string | null;
  defaultDepartmentId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ConvertProjectIdeaInput>({
    resolver: zodResolver(convertProjectIdeaSchema),
    defaultValues: {
      ideaId,
      responsableId: defaultResponsableId ?? undefined,
      departmentId: defaultDepartmentId ?? undefined,
    },
  });
  const responsableId = useWatch({ control, name: "responsableId" });
  const departmentId = useWatch({ control, name: "departmentId" });
  const { run: convert, isPending } = useAction(convertProjectIdeaToProject, {
    successMessage: "Projet créé à partir de l'idée.",
  });

  async function onSubmit(data: ConvertProjectIdeaInput) {
    const result = await convert(data);
    if (result.ok) {
      setOpen(false);
      router.push(`/projets/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="w-full">
          <Rocket className="mr-1 h-3.5 w-3.5" />
          Générer le projet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer le projet à partir de cette idée</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Responsable du projet</Label>
            <Select defaultValue={defaultResponsableId ?? undefined} onValueChange={(v) => setValue("responsableId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un responsable" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.responsableId && <p className="text-sm text-destructive">{errors.responsableId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Département</Label>
            <Select defaultValue={defaultDepartmentId ?? undefined} onValueChange={(v) => setValue("departmentId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un département" />
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
          <p className="text-xs text-muted-foreground">
            Le nom, la priorité, le budget et la localisation sont repris de l&apos;idée et de sa concept note.
          </p>
          <Button type="submit" className="w-full" disabled={isPending || !responsableId || !departmentId}>
            {isPending ? "Création..." : "Créer le projet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
