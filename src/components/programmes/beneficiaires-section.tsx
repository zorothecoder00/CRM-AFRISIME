"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createBeneficiaire, deleteBeneficiaire } from "@/actions/portal.actions";
import { createBeneficiaireSchema, type CreateBeneficiaireInput } from "@/lib/validations/portal.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";

export type BeneficiaireRow = {
  id: string;
  nom: string;
  description: string | null;
};

/** Registre des bénéficiaires (cahier des charges §20, portail Institution/Bailleur) — modèle minimal. */
export function BeneficiairesSection({
  programmeId,
  projectId,
  beneficiaires,
  canManage,
}: {
  programmeId?: string;
  projectId?: string;
  beneficiaires: BeneficiaireRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteBeneficiaire, { successMessage: "Bénéficiaire supprimé." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Personnes ou structures bénéficiant de ce programme.</p>
        {canManage && <BeneficiaireFormDialog programmeId={programmeId} projectId={projectId} />}
      </div>

      {beneficiaires.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun bénéficiaire enregistré.</p>
      ) : (
        <div className="space-y-2">
          {beneficiaires.map((b) => (
            <Card key={b.id} size="sm">
              <CardContent className="flex items-start justify-between gap-2 px-(--card-spacing)">
                <div className="flex items-start gap-2">
                  <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{b.nom}</div>
                    {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                  </div>
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(b.id)} aria-label="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BeneficiaireFormDialog({ programmeId, projectId }: { programmeId?: string; projectId?: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBeneficiaireInput>({
    resolver: zodResolver(createBeneficiaireSchema),
    defaultValues: { nom: "", description: "", programmeId, projectId },
  });
  const { run: submit, isPending } = useAction(createBeneficiaire, { successMessage: "Bénéficiaire ajouté." });

  async function onSubmit(data: CreateBeneficiaireInput) {
    const result = await submit({ ...data, programmeId, projectId });
    if (result.ok) {
      reset({ nom: "", description: "", programmeId, projectId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau bénéficiaire
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un bénéficiaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Coopérative Sème-la-Vie" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
