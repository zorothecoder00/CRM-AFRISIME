"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createDataForm,
  updateDataFormActif,
  deleteDataForm,
  addDataFormField,
  deleteDataFormField,
  submitDataForm,
  deleteDataFormSubmission,
} from "@/actions/data-form.actions";
import {
  createDataFormSchema,
  addDataFormFieldSchema,
  type CreateDataFormInput,
  type AddDataFormFieldInput,
} from "@/lib/validations/data-form.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

type Option = { id: string; label: string };

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXTE: "Texte",
  NOMBRE: "Nombre",
  DATE: "Date",
  CHOIX_UNIQUE: "Choix unique",
  OUI_NON: "Oui / Non",
};

export type DataFormFieldRow = {
  id: string;
  label: string;
  type: string;
  options: string | null;
  requis: boolean;
  indicatorNom: string | null;
};

export type DataFormSubmissionRow = {
  id: string;
  data: Record<string, string>;
  submittedByName: string | null;
  submittedAt: string;
};

export type DataFormRow = {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
  fields: DataFormFieldRow[];
  submissions: DataFormSubmissionRow[];
};

/** Formulaires de collecte (cahier des charges Project Studio §48) — "Formulaire bénéficiaire → collecte → base de données → indicateurs → dashboard". */
export function ProjectDataFormsSection({
  projectId,
  forms,
  indicators,
  canManage,
}: {
  projectId: string;
  forms: DataFormRow[];
  indicators: Option[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Créez un formulaire, ajoutez ses champs, puis collectez des réponses — un champ Nombre peut alimenter
          automatiquement un indicateur (§49).
        </p>
        {canManage && <DataFormCreateDialog projectId={projectId} />}
      </div>

      {forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun formulaire de collecte pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <DataFormCard key={form.id} form={form} indicators={indicators} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

function DataFormCard({ form, indicators, canManage }: { form: DataFormRow; indicators: Option[]; canManage: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { run: setActif } = useAction(updateDataFormActif, { successMessage: "Formulaire mis à jour." });
  const { run: remove } = useAction(deleteDataForm, { successMessage: "Formulaire supprimé." });

  return (
    <Card size="sm">
      <CardContent className="space-y-3 px-(--card-spacing)">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{form.nom}</span>
                <Badge variant={form.actif ? "success" : "secondary"}>{form.actif ? "Actif" : "Inactif"}</Badge>
                <Badge variant="outline">{form.fields.length} champ(s)</Badge>
                <Badge variant="outline">{form.submissions.length} réponse(s)</Badge>
              </div>
              {form.description && <p className="text-xs text-muted-foreground">{form.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {form.fields.length > 0 && <DataFormSubmitDialog form={form} />}
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setActif({ formId: form.id, actif: !form.actif })}
              >
                {form.actif ? "Désactiver" : "Activer"}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded((v) => !v)}>
              Détails
              {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
            {canManage && (
              <Button variant="ghost" size="icon-sm" onClick={() => remove({ formId: form.id })} aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="space-y-3 border-t pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Champs</span>
                {canManage && <DataFormFieldDialog formId={form.id} indicators={indicators} />}
              </div>
              {form.fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun champ défini.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {form.fields.map((f) => (
                    <FieldChip key={f.id} field={f} canManage={canManage} />
                  ))}
                </div>
              )}
            </div>

            {form.submissions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Dernières réponses</span>
                <div className="space-y-1.5">
                  {form.submissions.slice(0, 10).map((s) => (
                    <SubmissionRow key={s.id} submission={s} fields={form.fields} canManage={canManage} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FieldChip({ field, canManage }: { field: DataFormFieldRow; canManage: boolean }) {
  const { run: remove } = useAction(deleteDataFormField, { successMessage: "Champ supprimé." });
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
      {field.label}
      <Badge variant="outline">{FIELD_TYPE_LABELS[field.type]}</Badge>
      {field.requis && <span className="text-destructive">*</span>}
      {field.indicatorNom && <Badge variant="info">→ {field.indicatorNom}</Badge>}
      {canManage && (
        <button
          type="button"
          onClick={() => remove({ fieldId: field.id })}
          aria-label="Supprimer le champ"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function SubmissionRow({
  submission,
  fields,
  canManage,
}: {
  submission: DataFormSubmissionRow;
  fields: DataFormFieldRow[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteDataFormSubmission, { successMessage: "Réponse supprimée." });
  const parts = fields
    .map((f) => ({ label: f.label, value: submission.data[f.id] }))
    .filter((p) => p.value !== undefined && p.value !== "");

  return (
    <div className="flex items-start justify-between gap-2 rounded border p-1.5 text-xs">
      <div>
        <span className="text-muted-foreground">
          {new Date(submission.submittedAt).toLocaleDateString("fr-FR")}
          {submission.submittedByName && <> · {submission.submittedByName}</>}
        </span>
        <div>{parts.map((p) => `${p.label} : ${p.value}`).join(" · ")}</div>
      </div>
      {canManage && (
        <Button variant="ghost" size="icon-sm" onClick={() => remove({ submissionId: submission.id })} aria-label="Supprimer">
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function DataFormCreateDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDataFormInput>({
    resolver: zodResolver(createDataFormSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createDataForm, { successMessage: "Formulaire créé." });

  async function onSubmit(data: CreateDataFormInput) {
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
          Nouveau formulaire
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau formulaire de collecte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" placeholder="Ex. Formulaire bénéficiaire" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
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

function DataFormFieldDialog({ formId, indicators }: { formId: string; indicators: Option[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AddDataFormFieldInput["type"]>("TEXTE");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddDataFormFieldInput>({
    resolver: zodResolver(addDataFormFieldSchema),
    defaultValues: { formId, type: "TEXTE", requis: false },
  });
  const { run: submit, isPending } = useAction(addDataFormField, { successMessage: "Champ ajouté." });

  async function onSubmit(data: AddDataFormFieldInput) {
    const result = await submit({ ...data, formId });
    if (result.ok) {
      reset({ formId, type: "TEXTE", requis: false });
      setType("TEXTE");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Ajouter un champ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un champ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" placeholder="Ex. Nombre de bénéficiaires servis" {...register("label")} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              defaultValue="TEXTE"
              onValueChange={(v) => {
                const t = v as AddDataFormFieldInput["type"];
                setType(t);
                setValue("type", t);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "CHOIX_UNIQUE" && (
            <div className="space-y-2">
              <Label htmlFor="options">Options (séparées par |)</Label>
              <Input id="options" placeholder="Ex. Oui|Non|Sans avis" {...register("options")} />
            </div>
          )}
          {type === "NOMBRE" && indicators.length > 0 && (
            <div className="space-y-2">
              <Label>Alimenter un indicateur (facultatif)</Label>
              <Select onValueChange={(v) => setValue("indicatorId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {indicators.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                La valeur actuelle de l&apos;indicateur devient la somme des réponses à ce champ.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="requis" onCheckedChange={(v) => setValue("requis", v === true)} />
            <Label htmlFor="requis" className="text-sm font-normal">
              Champ obligatoire
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DataFormSubmitDialog({ form }: { form: DataFormRow }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const { run: submit, isPending } = useAction(submitDataForm, { successMessage: "Réponse enregistrée." });

  async function handleSubmit() {
    const result = await submit({ formId: form.id, data: values });
    if (result.ok) {
      setValues({});
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs">
          Répondre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.requis && <span className="text-destructive"> *</span>}
                </Label>
                {field.type === "TEXTE" && (
                  <Input value={values[field.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))} />
                )}
                {field.type === "NOMBRE" && (
                  <Input
                    type="number"
                    step="0.01"
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                )}
                {field.type === "DATE" && (
                  <Input
                    type="date"
                    value={values[field.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  />
                )}
                {field.type === "CHOIX_UNIQUE" && (
                  <Select onValueChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? "")
                        .split("|")
                        .map((o) => o.trim())
                        .filter(Boolean)
                        .map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === "OUI_NON" && (
                  <Select onValueChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oui">Oui</SelectItem>
                      <SelectItem value="Non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          <Button className="w-full" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
