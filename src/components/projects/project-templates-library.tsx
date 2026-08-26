"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectTemplate,
  deleteProjectTemplate,
  addProjectTemplatePhase,
  deleteProjectTemplatePhase,
} from "@/actions/project.actions";
import {
  createProjectTemplateSchema,
  addProjectTemplatePhaseSchema,
  PROJECT_TEMPLATE_CATEGORIES,
  type CreateProjectTemplateInput,
  type AddProjectTemplatePhaseInput,
} from "@/lib/validations/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, LayoutTemplate } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  ONG: "ONG",
  IT: "IT",
  EVENEMENTIEL: "Événementiel",
  FORMATION: "Formation",
  AGRICOLE: "Agricole",
  BTP: "BTP",
  DONOR_FUNDED: "Financé par bailleur",
  AUTRE: "Autre",
};

const PHASE_TYPE_LABELS: Record<string, string> = { PHASE: "Phase", SOUS_PHASE: "Sous-phase", LOT: "Lot" };

export type TemplatePhaseRow = { id: string; nom: string; type: string; description: string | null; ordre: number };

export type ProjectTemplateRow = {
  id: string;
  nom: string;
  categorie: string;
  description: string | null;
  phases: TemplatePhaseRow[];
};

/** Bibliothèque de modèles de projet (cahier des charges Project Studio §60). */
export function ProjectTemplatesLibrary({ templates, canManage }: { templates: ProjectTemplateRow[]; canManage: boolean }) {
  const byCategory = new Map<string, ProjectTemplateRow[]>();
  for (const t of templates) {
    byCategory.set(t.categorie, [...(byCategory.get(t.categorie) ?? []), t]);
  }
  const categories = PROJECT_TEMPLATE_CATEGORIES.filter((c) => byCategory.has(c));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Un modèle génère automatiquement ses phases WBS au moment de la création d&apos;un projet.
        </p>
        {canManage && <TemplateFormDialog />}
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun modèle pour le moment.</p>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-medium">{CATEGORY_LABELS[cat]}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {byCategory.get(cat)!.map((t) => (
                <TemplateCard key={t.id} template={t} canManage={canManage} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TemplateCard({ template, canManage }: { template: ProjectTemplateRow; canManage: boolean }) {
  const { run: remove } = useAction(deleteProjectTemplate, { successMessage: "Modèle supprimé." });
  const { run: removePhase } = useAction(deleteProjectTemplatePhase, { successMessage: "Phase supprimée." });
  const sortedPhases = [...template.phases].sort((a, b) => a.ordre - b.ordre);

  return (
    <Card size="sm">
      <CardContent className="space-y-2 px-(--card-spacing)">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">{template.nom}</div>
              {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
            </div>
          </div>
          {canManage && (
            <Button variant="ghost" size="icon-sm" onClick={() => remove({ templateId: template.id })} aria-label="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sortedPhases.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              {p.nom}
              <Badge variant="outline">{PHASE_TYPE_LABELS[p.type]}</Badge>
              {canManage && (
                <button
                  type="button"
                  onClick={() => removePhase({ phaseId: p.id })}
                  aria-label="Supprimer la phase"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {sortedPhases.length === 0 && <span className="text-xs text-muted-foreground">Aucune phase.</span>}
        </div>

        {canManage && <PhaseFormDialog templateId={template.id} />}
      </CardContent>
    </Card>
  );
}

function TemplateFormDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectTemplateInput>({ resolver: zodResolver(createProjectTemplateSchema) });
  const { run: submit, isPending } = useAction(createProjectTemplate, { successMessage: "Modèle créé." });

  async function onSubmit(data: CreateProjectTemplateInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau modèle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau modèle de projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Programme ONG standard" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select onValueChange={(v) => setValue("categorie", v as CreateProjectTemplateInput["categorie"])}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TEMPLATE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categorie && <p className="text-sm text-destructive">{errors.categorie.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhaseFormDialog({ templateId }: { templateId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddProjectTemplatePhaseInput>({
    resolver: zodResolver(addProjectTemplatePhaseSchema),
    defaultValues: { templateId, type: "PHASE" },
  });
  const { run: submit, isPending } = useAction(addProjectTemplatePhase, { successMessage: "Phase ajoutée." });

  async function onSubmit(data: AddProjectTemplatePhaseInput) {
    const result = await submit({ ...data, templateId });
    if (result.ok) {
      reset({ templateId, type: "PHASE" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Ajouter une phase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une phase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Diagnostic, Mobilisation..." {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue="PHASE" onValueChange={(v) => setValue("type", v as AddProjectTemplatePhaseInput["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PHASE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
