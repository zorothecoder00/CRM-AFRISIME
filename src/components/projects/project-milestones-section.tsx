"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectMilestone,
  updateProjectMilestoneStatus,
  deleteProjectMilestone,
} from "@/actions/project.actions";
import { createProjectMilestoneSchema, type CreateProjectMilestoneInput } from "@/lib/validations/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForMilestoneStatus } from "@/lib/status-tone";
import { Plus, Trash2, Milestone as MilestoneIcon, ChevronDown, ChevronUp, BadgeCheck } from "lucide-react";
import { DependencyFormDialog } from "@/components/dependencies/dependency-form-dialog";
import { DependencyList, type DependencyRow } from "@/components/dependencies/dependency-list";
import { DEPENDENCY_ENTITY_TYPES } from "@/lib/validations/dependency.schema";

type Option = { id: string; label: string };
type DependencyEntityType = (typeof DEPENDENCY_ENTITY_TYPES)[number];

export type MilestoneRow = {
  id: string;
  nom: string;
  description: string | null;
  dateCible: string;
  dateReelle: string | null;
  statut: string;
  valideurName: string | null;
  valideLe: string | null;
  dependencies: DependencyRow[];
};

const STATUT_LABELS: Record<string, string> = { A_VENIR: "À venir", ATTEINT: "Atteint", MANQUE: "Manqué" };

export function ProjectMilestonesSection({
  projectId,
  milestones,
  canManage,
  dependencyOptionsByType,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  canManage: boolean;
  dependencyOptionsByType: Record<DependencyEntityType, Option[]>;
}) {
  const { run: setStatus } = useAction(updateProjectMilestoneStatus, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteProjectMilestone, { successMessage: "Jalon supprimé." });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...milestones].sort((a, b) => new Date(a.dateCible).getTime() - new Date(b.dateCible).getTime());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Points de contrôle datés du projet.</p>
        {canManage && <MilestoneFormDialog projectId={projectId} />}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun jalon défini.</p>
      ) : (
        <ol className="space-y-2">
          {sorted.map((m) => (
            <li key={m.id}>
              <Card size="sm">
                <CardContent className="space-y-2 px-(--card-spacing)">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MilestoneIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{m.nom}</div>
                        {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Prévu : {new Date(m.dateCible).toLocaleDateString("fr-FR")}
                        {m.dateReelle && ` · Atteint : ${new Date(m.dateReelle).toLocaleDateString("fr-FR")}`}
                      </span>
                      {canManage ? (
                        <Select value={m.statut} onValueChange={(v) => setStatus({ milestoneId: m.id, statut: v as never })}>
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
                        <Badge variant={toneForMilestoneStatus(m.statut)}>{STATUT_LABELS[m.statut]}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      >
                        Dépendances ({m.dependencies.length})
                        {expandedId === m.id ? (
                          <ChevronUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ChevronDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                      {canManage && (
                        <Button variant="ghost" size="icon-sm" onClick={() => remove({ milestoneId: m.id })} aria-label="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {m.valideurName && m.valideLe && (
                    <p className="flex items-center gap-1 text-xs text-success">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Validé par {m.valideurName} le {new Date(m.valideLe).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {expandedId === m.id && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Dépendances du jalon</span>
                        {canManage && (
                          <DependencyFormDialog
                            optionsByType={dependencyOptionsByType}
                            defaultSourceType="ProjectMilestone"
                            defaultSourceId={m.id}
                          />
                        )}
                      </div>
                      <DependencyList dependencies={m.dependencies} canManage={canManage} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MilestoneFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectMilestoneInput>({
    resolver: zodResolver(createProjectMilestoneSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectMilestone, { successMessage: "Jalon ajouté." });

  async function onSubmit(data: CreateProjectMilestoneInput) {
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
          Nouveau jalon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un jalon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Livraison lot 1" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateCible">Date cible</Label>
            <Input id="dateCible" type="date" {...register("dateCible")} />
            {errors.dateCible && <p className="text-sm text-destructive">{errors.dateCible.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le jalon"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
