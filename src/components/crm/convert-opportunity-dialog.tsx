"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { convertOpportunityToProject } from "@/actions/crm.actions";
import { convertOpportunitySchema, type ConvertOpportunityInput } from "@/lib/validations/crm.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket } from "lucide-react";

type Option = { id: string; label: string };

/** Miroir de ConvertIdeaDialog — conversion Opportunité GAGNEE → Project. */
export function ConvertOpportunityDialog({
  opportunityId,
  users,
  departments,
}: {
  opportunityId: string;
  users: Option[];
  departments: Option[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ConvertOpportunityInput>({
    resolver: zodResolver(convertOpportunitySchema),
    defaultValues: { opportunityId },
  });
  const responsableId = useWatch({ control, name: "responsableId" });
  const departmentId = useWatch({ control, name: "departmentId" });
  const { run: convert, isPending } = useAction(convertOpportunityToProject, {
    successMessage: "Projet créé à partir de l'opportunité.",
  });

  async function onSubmit(data: ConvertOpportunityInput) {
    const result = await convert(data);
    if (result.ok) {
      setOpen(false);
      router.push(`/projets/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Rocket className="mr-1 h-3.5 w-3.5" />
          Générer le projet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer le projet à partir de cette opportunité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Responsable du projet</Label>
            <Select onValueChange={(v) => setValue("responsableId", v)}>
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
            <Select onValueChange={(v) => setValue("departmentId", v)}>
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
            Le nom, le montant estimé et la date de clôture sont repris de l&apos;opportunité.
          </p>
          <Button type="submit" className="w-full" disabled={isPending || !responsableId || !departmentId}>
            {isPending ? "Création..." : "Créer le projet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
