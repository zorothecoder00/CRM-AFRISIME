"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectDeliverable,
  updateProjectDeliverableStatus,
  deleteProjectDeliverable,
} from "@/actions/project.actions";
import { createProjectDeliverableSchema, type CreateProjectDeliverableInput } from "@/lib/validations/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForDeliverableStatus } from "@/lib/status-tone";
import { Plus, Trash2, Package } from "lucide-react";

type Option = { id: string; label: string };

export type DeliverableRow = {
  id: string;
  nom: string;
  description: string | null;
  statut: string;
  echeance: string | null;
  responsableName: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  SOUMIS: "Soumis",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

export function ProjectDeliverablesSection({
  projectId,
  deliverables,
  users,
  canManage,
}: {
  projectId: string;
  deliverables: DeliverableRow[];
  users: Option[];
  canManage: boolean;
}) {
  const { run: setStatus } = useAction(updateProjectDeliverableStatus, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteProjectDeliverable, { successMessage: "Livrable supprimé." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Livrables attendus du projet, avec cycle de vie propre (à faire → soumis → validé/rejeté).
        </p>
        {canManage && <DeliverableFormDialog projectId={projectId} users={users} />}
      </div>

      {deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun livrable défini.</p>
      ) : (
        <div className="space-y-2">
          {deliverables.map((d) => (
            <Card key={d.id} size="sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing)">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{d.nom}</div>
                    {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                    <div className="text-xs text-muted-foreground">
                      {d.responsableName && <>Responsable : {d.responsableName} · </>}
                      {d.echeance ? `Échéance : ${new Date(d.echeance).toLocaleDateString("fr-FR")}` : "Sans échéance"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select value={d.statut} onValueChange={(v) => setStatus({ deliverableId: d.id, statut: v as never })}>
                      <SelectTrigger className="h-7 w-auto text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={toneForDeliverableStatus(d.statut)}>{STATUT_LABELS[d.statut]}</Badge>
                  )}
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" onClick={() => remove({ deliverableId: d.id })} aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliverableFormDialog({ projectId, users }: { projectId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectDeliverableInput>({
    resolver: zodResolver(createProjectDeliverableSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectDeliverable, { successMessage: "Livrable ajouté." });

  async function onSubmit(data: CreateProjectDeliverableInput) {
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
          Nouveau livrable
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un livrable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Rapport d'avancement mensuel" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="echeance">Échéance</Label>
            <Input id="echeance" type="date" {...register("echeance")} />
          </div>
          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select onValueChange={(v) => setValue("responsableId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Non assigné" />
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
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le livrable"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
