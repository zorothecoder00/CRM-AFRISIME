"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createCommunicationPlanEntry,
  generateCommunicationPlan,
  deleteCommunicationPlanEntry,
} from "@/actions/communication-plan.actions";
import {
  createCommunicationPlanEntrySchema,
  type CreateCommunicationPlanEntryInput,
} from "@/lib/validations/communication-plan.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Trash2 } from "lucide-react";

export type CommunicationPlanEntryRow = {
  id: string;
  public: string;
  message: string | null;
  canal: string | null;
  frequence: string | null;
  responsableName: string | null;
};

/** Communication Plan (Project Studio §36). */
export function CommunicationPlanSection({
  projectId,
  entries,
  users,
  canManage,
}: {
  projectId: string;
  entries: CommunicationPlanEntryRow[];
  users: { id: string; label: string }[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteCommunicationPlanEntry, { successMessage: "Ligne supprimée." });
  const { run: generate, isPending: generating } = useAction(generateCommunicationPlan, {
    successMessage: (r) => (r.created > 0 ? `${r.created} ligne(s) générée(s) depuis les parties prenantes.` : "Aucune nouvelle partie prenante à ajouter."),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Public, message, canal et fréquence de communication par partie prenante.
        </p>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={generating} onClick={() => generate({ projectId })}>
              <Sparkles className="mr-1 h-4 w-4" />
              Générer depuis les parties prenantes
            </Button>
            <EntryFormDialog projectId={projectId} users={users} />
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune ligne dans le plan de communication.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-2">Public</th>
                <th className="p-2">Message</th>
                <th className="p-2">Canal</th>
                <th className="p-2">Fréquence</th>
                <th className="p-2">Responsable</th>
                {canManage && <th className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2 font-medium">{e.public}</td>
                  <td className="p-2">{e.message ?? "—"}</td>
                  <td className="p-2">{e.canal ?? "—"}</td>
                  <td className="p-2">{e.frequence ?? "—"}</td>
                  <td className="p-2">{e.responsableName ?? "—"}</td>
                  {canManage && (
                    <td className="p-2">
                      <Button variant="ghost" size="icon-sm" onClick={() => remove({ entryId: e.id })} aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntryFormDialog({ projectId, users }: { projectId: string; users: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCommunicationPlanEntryInput>({
    resolver: zodResolver(createCommunicationPlanEntrySchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createCommunicationPlanEntry, { successMessage: "Ligne ajoutée." });

  async function onSubmit(data: CreateCommunicationPlanEntryInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle ligne
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ligne au plan de communication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-public">Public visé</Label>
            <Input id="cp-public" {...register("public")} />
            {errors.public && <p className="text-sm text-destructive">{errors.public.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-message">Message</Label>
            <Input id="cp-message" {...register("message")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp-canal">Canal</Label>
              <Input id="cp-canal" placeholder="Ex. Réunion, e-mail..." {...register("canal")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-frequence">Fréquence</Label>
              <Input id="cp-frequence" placeholder="Ex. Hebdomadaire..." {...register("frequence")} />
            </div>
          </div>
          {users.length > 0 && (
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select onValueChange={(v) => setValue("responsableId", v)}>
                <SelectTrigger className="w-full">
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
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
