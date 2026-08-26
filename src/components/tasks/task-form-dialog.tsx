"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createTask, suggestTaskAssignees } from "@/actions/task.actions";
import type { CandidateScore } from "@/lib/resource-allocation";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations/task.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

type Option = { id: string; label: string };
type ProjectWithSections = { id: string; nom: string; sections: Option[] };

export function TaskFormDialog({
  projects,
  users,
  objectives,
  plans,
  competences,
}: {
  projects: ProjectWithSections[];
  users: Option[];
  /** Origines optionnelles (cahier des charges §IX). */
  objectives?: Option[];
  plans?: Option[];
  /** Compétences requises (V2.2 §9.2) — alimente la suggestion de responsable. */
  competences?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [competenceIds, setCompetenceIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<CandidateScore[] | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priorite: "MOYENNE", subtasks: [] },
  });
  const { fields: subtaskFields, append: appendSubtask, remove: removeSubtask } = useFieldArray({
    control,
    name: "subtasks",
  });
  const { run: submit, isPending } = useAction(createTask, { successMessage: "Tâche créée." });
  const { run: suggest, isPending: isSuggesting } = useAction(suggestTaskAssignees);

  async function handleSuggest() {
    if (!selectedProjectId) return;
    const result = await suggest(
      selectedProjectId,
      getValues("echeance") || undefined,
      competenceIds,
      getValues("priorite")
    );
    if (result.ok) setSuggestions(result.data);
  }

  const sectionsForProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId)?.sections ?? [],
    [projects, selectedProjectId]
  );

  async function onSubmit(data: CreateTaskInput) {
    const result = await submit({ ...data, assigneeIds, competenceIds });
    if (result.ok) {
      reset();
      setSelectedProjectId(undefined);
      setAssigneeIds([]);
      setCompetenceIds([]);
      setSuggestions(null);
      setOpen(false);
    }
  }

  function toggleAssignee(userId: string, checked: boolean) {
    setAssigneeIds((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  function toggleCompetence(competenceId: string, checked: boolean) {
    setCompetenceIds((prev) => (checked ? [...prev, competenceId] : prev.filter((id) => id !== competenceId)));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <Select
              onValueChange={(v) => {
                setSelectedProjectId(v);
                setValue("projectId", v);
                setValue("sectionId", undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          {sectionsForProject.length > 0 && (
            <div className="space-y-2">
              <Label>Phase / Sous-phase / Lot</Label>
              <Select onValueChange={(v) => setValue("sectionId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsForProject.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Responsable principal</Label>
                {selectedProjectId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleSuggest}
                    disabled={isSuggesting}
                  >
                    {isSuggesting ? "Analyse..." : "Suggérer un responsable"}
                  </Button>
                )}
              </div>
              <Select onValueChange={(v) => setValue("responsablePrincipalId", v)}>
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
              {errors.responsablePrincipalId && (
                <p className="text-sm text-destructive">{errors.responsablePrincipalId.message}</p>
              )}
              {suggestions && (
                <div className="space-y-1 rounded-md border p-2">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun profil disponible.</p>
                  ) : (
                    suggestions.map((c) => (
                      <button
                        key={c.userId}
                        type="button"
                        onClick={() => {
                          setValue("responsablePrincipalId", c.userId);
                          setSuggestions(null);
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-muted"
                      >
                        <span>
                          {c.name} <span className="text-muted-foreground">({c.roleLabel})</span>
                        </span>
                        <span className="text-muted-foreground">
                          {c.scoreTotal}/100 · charge {c.tauxOccupation}%{c.enConge ? " · en congé" : ""}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select
                defaultValue="MOYENNE"
                onValueChange={(v) => setValue("priorite", v as CreateTaskInput["priorite"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRES_HAUTE">Très haute</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="BASSE">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Co-responsables</Label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={assigneeIds.includes(u.id)}
                    onCheckedChange={(c) => toggleAssignee(u.id, c === true)}
                  />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          {competences && competences.length > 0 && (
            <div className="space-y-2">
              <Label>Compétences requises (optionnel)</Label>
              <p className="text-xs text-muted-foreground">
                Utilisées par « Suggérer un responsable » pour évaluer la correspondance.
              </p>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {competences.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={competenceIds.includes(c.id)}
                      onCheckedChange={(checked) => toggleCompetence(c.id, checked === true)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="echeance">Échéance</Label>
              <Input id="echeance" type="date" {...register("echeance")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempsEstimeHeures">Temps estimé (h)</Label>
              <Input id="tempsEstimeHeures" type="number" step="0.5" {...register("tempsEstimeHeures")} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sous-tâches (optionnel)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSubtask({ titre: "", responsablePrincipalId: "", priorite: "MOYENNE", echeance: "" })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Ajouter une sous-tâche
              </Button>
            </div>
            {subtaskFields.length > 0 && (
              <div className="space-y-2">
                {subtaskFields.map((field, index) => (
                  <Card key={field.id} size="sm">
                    <CardContent className="space-y-2 px-(--card-spacing)">
                      <div className="flex items-start gap-2">
                        <Input
                          placeholder="Titre de la sous-tâche"
                          className="flex-1"
                          {...register(`subtasks.${index}.titre` as const)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSubtask(index)}
                          aria-label="Supprimer la sous-tâche"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {errors.subtasks?.[index]?.titre && (
                        <p className="text-xs text-destructive">{errors.subtasks[index]?.titre?.message}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <Select onValueChange={(v) => setValue(`subtasks.${index}.responsablePrincipalId`, v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Responsable" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          defaultValue="MOYENNE"
                          onValueChange={(v) => setValue(`subtasks.${index}.priorite`, v as CreateTaskInput["priorite"])}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRES_HAUTE">Très haute</SelectItem>
                            <SelectItem value="HAUTE">Haute</SelectItem>
                            <SelectItem value="MOYENNE">Moyenne</SelectItem>
                            <SelectItem value="BASSE">Basse</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="date" className="h-8 text-xs" {...register(`subtasks.${index}.echeance` as const)} />
                      </div>
                      {errors.subtasks?.[index]?.responsablePrincipalId && (
                        <p className="text-xs text-destructive">
                          {errors.subtasks[index]?.responsablePrincipalId?.message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {(objectives && objectives.length > 0) || (plans && plans.length > 0) ? (
            <div className="grid grid-cols-2 gap-4">
              {objectives && objectives.length > 0 && (
                <div className="space-y-2">
                  <Label>Objectif lié (optionnel)</Label>
                  <Select onValueChange={(v) => setValue("objectiveId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {plans && plans.length > 0 && (
                <div className="space-y-2">
                  <Label>Plan lié (optionnel)</Label>
                  <Select onValueChange={(v) => setValue("planId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer la tâche"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
