"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createContract } from "@/actions/contract.actions";
import { createContractSchema, type CreateContractInput } from "@/lib/validations/contract.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function ContractFormDialog({
  defaultOpportunityId,
  defaultOrganizationId,
}: {
  defaultOpportunityId?: string;
  defaultOrganizationId?: string;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: { opportunityId: defaultOpportunityId, organizationId: defaultOrganizationId },
  });
  const { run: submit, isPending } = useAction(createContract, { successMessage: "Contrat créé." });

  async function onSubmit(data: CreateContractInput) {
    const result = await submit({ ...data, opportunityId: defaultOpportunityId, organizationId: defaultOrganizationId });
    if (result.ok) {
      reset({ nom: "", montant: "", dateSignature: "", dateExpiration: "", opportunityId: defaultOpportunityId, organizationId: defaultOrganizationId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un contrat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du contrat</Label>
            <Input {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input type="number" step="0.01" {...register("montant")} />
            </div>
            <div className="space-y-2">
              <Label>Signature</Label>
              <Input type="date" {...register("dateSignature")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expiration (facultatif)</Label>
            <Input type="date" {...register("dateExpiration")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le contrat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
