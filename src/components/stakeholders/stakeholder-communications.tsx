"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createStakeholderCommunication } from "@/actions/stakeholder.actions";
import {
  createStakeholderCommunicationSchema,
  type CreateStakeholderCommunicationInput,
} from "@/lib/validations/stakeholder.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MessageSquare } from "lucide-react";

export type CommunicationRow = {
  id: string;
  date: string;
  canal: string | null;
  resume: string;
  authorName: string;
};

/** Fil de communications avec une partie prenante (cahier des charges V2.2 §21, "historique"). */
export function StakeholderCommunications({
  stakeholderId,
  communications,
  canManage,
}: {
  stakeholderId: string;
  communications: CommunicationRow[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Historique des échanges avec cette partie prenante.</p>
        {canManage && <CommunicationFormDialog stakeholderId={stakeholderId} />}
      </div>
      {communications.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune communication enregistrée.</p>
      ) : (
        <ul className="space-y-2">
          {communications.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-md border p-3 text-sm">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {c.canal && <span className="font-medium text-foreground">{c.canal} · </span>}
                    {c.authorName}
                  </span>
                  <span>{new Date(c.date).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="whitespace-pre-wrap">{c.resume}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommunicationFormDialog({ stakeholderId }: { stakeholderId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStakeholderCommunicationInput>({
    resolver: zodResolver(createStakeholderCommunicationSchema),
    defaultValues: { stakeholderId, date: new Date().toISOString().slice(0, 10) },
  });
  const { run: submit, isPending } = useAction(createStakeholderCommunication, {
    successMessage: "Communication ajoutée.",
  });

  async function onSubmit(data: CreateStakeholderCommunicationInput) {
    const result = await submit({ ...data, stakeholderId });
    if (result.ok) {
      reset({ stakeholderId, date: new Date().toISOString().slice(0, 10), canal: "", resume: "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter une communication
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une communication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="canal">Canal</Label>
            <Input id="canal" placeholder="Ex. Appel, email, réunion..." {...register("canal")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">Résumé</Label>
            <Textarea id="resume" {...register("resume")} />
            {errors.resume && <p className="text-sm text-destructive">{errors.resume.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
