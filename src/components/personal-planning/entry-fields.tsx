"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadButton } from "@/lib/uploadthing";
import {
  ENTRY_TYPE_META,
  ENTRY_TYPE_OPTIONS,
  ENTRY_PRIORITE_META,
  ENTRY_REPETITION_LABELS,
  ENTRY_RAPPEL_LABELS,
  ENTRY_RAPPEL_ORDER,
} from "@/lib/personal-planning-types";
import { ChevronDown, ChevronUp, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export type PersonalPlanningReferenceData = {
  colleagues: { id: string; label: string }[];
  projects: { id: string; nom: string }[];
  tasks: { id: string; titre: string; projectId: string | null }[];
  objectives: { id: string; titre: string }[];
};

type FieldValues = {
  titre: string;
  notes?: string;
  dateDebut: string;
  dateFin: string;
  type: string;
  priorite: string;
  lieu?: string;
  dureeTrajetMinutes?: number;
  projetId?: string;
  tacheId?: string;
  objectifId?: string;
  participantIds: string[];
  etiquettes: string[];
  repetition: string;
  repetitionFin?: string;
  rappels: string[];
  rappelPersonnaliseDate?: string;
  piecesJointes: string[];
  missionDestination?: string;
  missionBudget?: string;
  missionMoyenTransport?: string;
  missionHebergement?: string;
  missionRapport?: string;
};

/**
 * Champs communs de création/édition d'une activité (§9) — partagés entre
 * entry-form-dialog.tsx et entry-edit-dialog.tsx. `register`/`watch`/
 * `setValue` sont ré-typés en accès libre par nom de champ : react-hook-form
 * dérive `Path<T>` du type exact de useForm (Create vs Update, qui diffèrent
 * sur `id`/`statut`), ce composant générique n'a besoin que du sous-ensemble
 * de champs commun (FieldValues) — le cast borne cette perte de précision au
 * seul point d'entrée plutôt que de la répéter à chaque appel.
 */
export function PersonalPlanningEntryFields<T extends FieldValues>({
  form,
  refData,
  idPrefix,
  showMissionReport = false,
}: {
  form: UseFormReturn<T>;
  refData: PersonalPlanningReferenceData;
  idPrefix: string;
  /** Le rapport de mission ne se remplit qu'après coup (édition), comme le compte rendu de réunion. */
  showMissionReport?: boolean;
}) {
  const register = form.register as unknown as (name: keyof FieldValues) => ReturnType<UseFormReturn<FieldValues>["register"]>;
  const watch = form.watch as unknown as (name: keyof FieldValues) => unknown;
  const setValue = form.setValue as unknown as (name: keyof FieldValues, value: unknown, opts?: { shouldDirty?: boolean }) => void;
  const errors = form.formState.errors as unknown as Record<string, { message?: string } | undefined>;

  const [showMore, setShowMore] = useState(false);
  const [tagsText, setTagsText] = useState(((watch("etiquettes") as string[] | undefined) ?? []).join(", "));

  const projetId = watch("projetId") as string | undefined;
  const participantIds = (watch("participantIds") as string[] | undefined) ?? [];
  const repetition = watch("repetition") as string;
  const piecesJointes = (watch("piecesJointes") as string[] | undefined) ?? [];
  const rappels = (watch("rappels") as string[] | undefined) ?? [];
  const type = watch("type") as string;

  const availableTasks = projetId ? refData.tasks.filter((t) => t.projectId === projetId) : refData.tasks;

  function toggleParticipant(id: string, checked: boolean) {
    const next = checked ? [...participantIds, id] : participantIds.filter((p) => p !== id);
    setValue("participantIds", next, { shouldDirty: true });
  }

  function toggleRappel(value: string, checked: boolean) {
    const next = checked ? [...rappels, value] : rappels.filter((r) => r !== value);
    setValue("rappels", next, { shouldDirty: true });
  }

  function updateTags(text: string) {
    setTagsText(text);
    const parsed = text.split(",").map((t) => t.trim()).filter(Boolean);
    setValue("etiquettes", parsed, { shouldDirty: true });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-titre`}>Titre</Label>
        <Input id={`${idPrefix}-titre`} placeholder="Ex. Rendez-vous médecin" {...register("titre")} />
        {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select defaultValue={watch("type") as string} onValueChange={(v) => setValue("type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {ENTRY_TYPE_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priorité</Label>
          <Select defaultValue={watch("priorite") as string} onValueChange={(v) => setValue("priorite", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ENTRY_PRIORITE_META) as (keyof typeof ENTRY_PRIORITE_META)[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {ENTRY_PRIORITE_META[p].emoji} {ENTRY_PRIORITE_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-dateDebut`}>Début</Label>
          <Input id={`${idPrefix}-dateDebut`} type="datetime-local" {...register("dateDebut")} />
          {errors.dateDebut && <p className="text-sm text-destructive">{errors.dateDebut.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-dateFin`}>Fin</Label>
          <Input id={`${idPrefix}-dateFin`} type="datetime-local" {...register("dateFin")} />
          {errors.dateFin && <p className="text-sm text-destructive">{errors.dateFin.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Description</Label>
        <Textarea id={`${idPrefix}-notes`} {...register("notes")} />
      </div>

      {/* §19/§20 — la liaison à un projet/tâche existant reste ici, dans la
          zone toujours visible : c'est ce qui relie l'activité à l'objet
          Tâche unique (§4) plutôt que de dupliquer un travail déjà suivi
          ailleurs — pas quelque chose à enterrer dans "Plus d'options". */}
      <div className="grid grid-cols-2 gap-4 rounded-md border border-dashed p-3">
        <div className="space-y-2">
          <Label>Projet associé</Label>
          <Select
            value={projetId || "none"}
            onValueChange={(v) => {
              setValue("projetId", v === "none" ? "" : v);
              setValue("tacheId", "");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {refData.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tâche associée</Label>
          <Select value={(watch("tacheId") as string | undefined) || "none"} onValueChange={(v) => setValue("tacheId", v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune</SelectItem>
              {availableTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {refData.tasks.length === 0 && <p className="text-xs text-muted-foreground">Aucune tâche disponible pour le moment.</p>}
        </div>
      </div>

      {type === "MISSION" && (
        <div className="space-y-4 rounded-md border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Détails de la mission (§26bis)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-missionDestination`}>Destination</Label>
              <Input id={`${idPrefix}-missionDestination`} {...register("missionDestination")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-missionBudget`}>Budget</Label>
              <Input id={`${idPrefix}-missionBudget`} type="number" step="0.01" {...register("missionBudget")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-missionMoyenTransport`}>Moyen de transport</Label>
              <Input id={`${idPrefix}-missionMoyenTransport`} {...register("missionMoyenTransport")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-missionHebergement`}>Hébergement</Label>
              <Input id={`${idPrefix}-missionHebergement`} {...register("missionHebergement")} />
            </div>
          </div>
          {showMissionReport && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-missionRapport`}>Rapport de mission (à remplir après)</Label>
              <Textarea id={`${idPrefix}-missionRapport`} {...register("missionRapport")} />
            </div>
          )}
        </div>
      )}

      <Button type="button" variant="ghost" size="sm" onClick={() => setShowMore((v) => !v)} className="gap-1 px-0">
        {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Plus d&apos;options (lieu, participants, objectif, étiquettes, répétition, rappel, pièces jointes)
      </Button>

      {showMore && (
        <div className="space-y-4 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-lieu`}>Lieu</Label>
              <Input id={`${idPrefix}-lieu`} {...register("lieu")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-dureeTrajetMinutes`}>Temps de trajet avant (minutes)</Label>
              <Input id={`${idPrefix}-dureeTrajetMinutes`} type="number" min={0} max={480} step={5} {...register("dureeTrajetMinutes")} />
            </div>
          </div>
          {/* §15 — avec un lieu et un temps de trajet, un bloc "🚗 Déplacement" est
              réservé automatiquement juste avant, à la création (pas à l'édition —
              évite de dupliquer/désynchroniser le bloc si l'horaire change ensuite). */}
          <p className="-mt-2 text-xs text-muted-foreground">
            Avec un lieu renseigné, un bloc « 🚗 Déplacement » est réservé automatiquement juste avant, à la création de l&apos;activité.
          </p>

          {refData.colleagues.length > 0 && (
            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {refData.colleagues.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={participantIds.includes(c.id)} onCheckedChange={(checked) => toggleParticipant(c.id, checked === true)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Objectif associé</Label>
            <Select value={(watch("objectifId") as string | undefined) || "none"} onValueChange={(v) => setValue("objectifId", v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {refData.objectives.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-etiquettes`}>Étiquettes (séparées par des virgules)</Label>
            <Input id={`${idPrefix}-etiquettes`} value={tagsText} onChange={(e) => updateTags(e.target.value)} placeholder="Ex. urgent, client-x" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Répétition</Label>
              <Select defaultValue={watch("repetition") as string} onValueChange={(v) => setValue("repetition", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENTRY_REPETITION_LABELS) as (keyof typeof ENTRY_REPETITION_LABELS)[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ENTRY_REPETITION_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {repetition !== "AUCUNE" && (
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-repetitionFin`}>Jusqu&apos;au</Label>
                <Input id={`${idPrefix}-repetitionFin`} type="date" {...register("repetitionFin")} />
                {errors.repetitionFin && <p className="text-sm text-destructive">{errors.repetitionFin.message}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rappels (§24 — plusieurs possibles)</Label>
            <div className="flex flex-wrap gap-3">
              {ENTRY_RAPPEL_ORDER.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={rappels.includes(r)} onCheckedChange={(checked) => toggleRappel(r, checked === true)} />
                  {ENTRY_RAPPEL_LABELS[r]}
                </label>
              ))}
            </div>
            {rappels.includes("PERSONNALISE") && (
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-rappelPersonnaliseDate`}>Date/heure du rappel personnalisé</Label>
                <Input id={`${idPrefix}-rappelPersonnaliseDate`} type="datetime-local" {...register("rappelPersonnaliseDate")} />
                {errors.rappelPersonnaliseDate && <p className="text-sm text-destructive">{errors.rappelPersonnaliseDate.message}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Pièces jointes</Label>
            {piecesJointes.length > 0 && (
              <ul className="space-y-1">
                {piecesJointes.map((url) => (
                  <li key={url} className="flex items-center gap-2 rounded-md border p-1.5 text-xs">
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{url.split("/").pop()}</span>
                    <button
                      type="button"
                      onClick={() => setValue("piecesJointes", piecesJointes.filter((u) => u !== url))}
                      aria-label="Retirer la pièce jointe"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <UploadButton
              endpoint="personalPlanningAttachmentUploader"
              onClientUploadComplete={(res) => {
                setValue("piecesJointes", [...piecesJointes, ...res.map((f) => f.url)]);
                toast.success("Pièce(s) jointe(s) ajoutée(s).");
              }}
              onUploadError={(uploadError) => {
                toast.error(`Échec du téléversement : ${uploadError.message}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function EntryTypeBadge({ type }: { type: keyof typeof ENTRY_TYPE_META }) {
  const meta = ENTRY_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
