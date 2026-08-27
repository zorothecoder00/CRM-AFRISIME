"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { convertFundingOpportunityToProject } from "@/actions/funding-opportunity.actions";
import {
  convertFundingOpportunitySchema,
  type ConvertFundingOpportunityInput,
} from "@/lib/validations/funding-opportunity.schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket } from "lucide-react";

type Option = { id: string; label: string };

/** Miroir de ConvertIdeaDialog/ConvertOpportunityDialog — formalise un appel à projets en Project. */
export function ConvertFundingOpportunityDialog({
  fundingOpportunityId,
  users,
  departments,
}: {
  fundingOpportunityId: string;
  users: Option[];
  departments: Option[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConvertFundingOpportunityInput>({
    resolver: zodResolver(convertFundingOpportunitySchema),
    defaultValues: { fundingOpportunityId },
  });
  const { run: convert, isPending } = useAction(convertFundingOpportunityToProject, {
    successMessage: "Projet créé à partir de l'appel à projets.",
  });

  async function onSubmit(data: ConvertFundingOpportunityInput) {
    const result = await convert(data);
    if (result.ok) {
      setOpen(false);
      router.push(`/projets/${result.data.id}`);
    }
  }

  if (users.length === 0 || departments.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Rocket className="mr-1 h-3.5 w-3.5" />
          Convertir en projet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer le projet à partir de cet appel à projets</DialogTitle>
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
          <Button type="submit" className="w-full" disabled={isPending || !watch("responsableId") || !watch("departmentId")}>
            {isPending ? "Création..." : "Créer le projet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
