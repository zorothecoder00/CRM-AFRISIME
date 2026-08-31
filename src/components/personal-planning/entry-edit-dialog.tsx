"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import {
  updatePersonalPlanningEntry,
  deletePersonalPlanningEntry,
  deletePersonalPlanningEntrySeries,
  promoteEntryToTask,
  getPersonalPlanningEntryHistory,
} from "@/actions/personal-planning.actions";
import { PersonalPlanningHistory, type PersonalPlanningHistoryEntry } from "@/components/personal-planning/personal-planning-history";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  updatePersonalPlanningEntrySchema,
  type UpdatePersonalPlanningEntryInput,
} from "@/lib/validations/personal-planning.schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonalPlanningEntryFields, type PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import {
  ENTRY_STATUT_LABELS,
  ENTRY_MOTIF_BLOCAGE_LABELS,
  type PersonalPlanningEntryStatut,
  type PersonalPlanningMotifBlocage,
} from "@/lib/personal-planning-types";

export type PersonalPlanningEntryEditData = {
  id: string;
  titre: string;
  notes: string | null;
  dateDebut: string;
  dateFin: string;
  type: Exclude<UpdatePersonalPlanningEntryInput["type"], "RESERVE">;
  statut: PersonalPlanningEntryStatut;
  motifBlocage: PersonalPlanningMotifBlocage | null;
  priorite: UpdatePersonalPlanningEntryInput["priorite"];
  lieu: string | null;
  projetId: string | null;
  tacheId: string | null;
  objectifId: string | null;
  participantIds: string[];
  etiquettes: string[];
  repetition: UpdatePersonalPlanningEntryInput["repetition"];
  repetitionFin: string | null;
  rappels: UpdatePersonalPlanningEntryInput["rappels"];
  rappelPersonnaliseDate: string | null;
  piecesJointes: string[];
  missionDestination: string | null;
  missionBudget: string | null;
  missionMoyenTransport: string | null;
  missionHebergement: string | null;
  missionRapport: string | null;
  /** §9/§44 — présent si l'entrée fait partie d'une série récurrente (occurrences partageant le même id de groupe), pour proposer "Supprimer la série". */
  recurrenceGroupId: string | null;
};

/** Édition d'une entrée existante — dialogue contrôlé, ouvert depuis la grille hebdomadaire. Édite une occurrence unique ; "Supprimer la série" (§44) supprime aussi les occurrences futures de la même série. */
export function PersonalPlanningEntryEditDialog({
  entry,
  open,
  onOpenChange,
  refData,
}: {
  entry: PersonalPlanningEntryEditData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refData: PersonalPlanningReferenceData;
}) {
  const form = useForm<UpdatePersonalPlanningEntryInput>({
    resolver: zodResolver(updatePersonalPlanningEntrySchema),
    defaultValues: {
      id: entry.id,
      titre: entry.titre,
      notes: entry.notes ?? "",
      dateDebut: entry.dateDebut.slice(0, 16),
      dateFin: entry.dateFin.slice(0, 16),
      type: entry.type,
      statut: entry.statut,
      motifBlocage: entry.motifBlocage ?? undefined,
      priorite: entry.priorite,
      lieu: entry.lieu ?? "",
      projetId: entry.projetId ?? "",
      tacheId: entry.tacheId ?? "",
      objectifId: entry.objectifId ?? "",
      participantIds: entry.participantIds,
      etiquettes: entry.etiquettes,
      repetition: entry.repetition,
      repetitionFin: entry.repetitionFin?.slice(0, 10) ?? "",
      rappels: entry.rappels,
      rappelPersonnaliseDate: entry.rappelPersonnaliseDate?.slice(0, 16) ?? "",
      piecesJointes: entry.piecesJointes,
      missionDestination: entry.missionDestination ?? "",
      missionBudget: entry.missionBudget ?? "",
      missionMoyenTransport: entry.missionMoyenTransport ?? "",
      missionHebergement: entry.missionHebergement ?? "",
      missionRapport: entry.missionRapport ?? "",
    },
  });
  const { handleSubmit, watch, setValue, formState } = form;
  const { run: submit, isPending } = useAction(updatePersonalPlanningEntry, { successMessage: "Entrée modifiée." });
  const { run: remove, isPending: isDeleting } = useAction(deletePersonalPlanningEntry, { successMessage: "Entrée supprimée." });
  const { run: removeSeries, isPending: isDeletingSeries } = useAction(deletePersonalPlanningEntrySeries, {
    successMessage: (r) => `${r.count} occurrence(s) future(s) supprimée(s).`,
  });
  const { run: promote, isPending: isPromoting } = useAction(promoteEntryToTask, { successMessage: "Tâche créée." });
  const [promoteProjectId, setPromoteProjectId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<PersonalPlanningHistoryEntry[] | null>(null);
  const statut = watch("statut");
  const motifBlocageError = (formState.errors as Record<string, { message?: string } | undefined>).motifBlocage;

  async function onPromote() {
    if (!promoteProjectId) return;
    const result = await promote({ entryId: entry.id, projectId: promoteProjectId });
    if (result.ok) setValue("tacheId", result.data.id);
  }

  async function onSubmit(data: UpdatePersonalPlanningEntryInput) {
    const result = await submit(data);
    if (result.ok) onOpenChange(false);
  }

  async function onDelete() {
    if (!window.confirm(`Supprimer « ${entry.titre} » ?`)) return;
    const result = await remove({ id: entry.id });
    if (result.ok) onOpenChange(false);
  }

  async function onDeleteSeries() {
    if (!entry.recurrenceGroupId) return;
    if (!window.confirm(`Supprimer toutes les occurrences futures de « ${entry.titre} » ?`)) return;
    const result = await removeSeries({ recurrenceGroupId: entry.recurrenceGroupId });
    if (result.ok) onOpenChange(false);
  }

  async function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history === null) {
      setHistoryLoading(true);
      try {
        setHistory(await getPersonalPlanningEntryHistory(entry.id));
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;activité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select defaultValue={statut} onValueChange={(v) => setValue("statut", v as PersonalPlanningEntryStatut)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ENTRY_STATUT_LABELS) as PersonalPlanningEntryStatut[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ENTRY_STATUT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {statut === "BLOQUEE" && (
            <div className="space-y-2">
              <Label>Motif du blocage (§22)</Label>
              <Select
                defaultValue={watch("motifBlocage")}
                onValueChange={(v) => setValue("motifBlocage", v as PersonalPlanningMotifBlocage)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un motif" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENTRY_MOTIF_BLOCAGE_LABELS) as PersonalPlanningMotifBlocage[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {ENTRY_MOTIF_BLOCAGE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {motifBlocageError && <p className="text-sm text-destructive">{motifBlocageError.message}</p>}
            </div>
          )}

          {!entry.tacheId && refData.projects.length > 0 && (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <Label>Transformer en tâche / ajouter à un projet (§29)</Label>
              <div className="flex gap-2">
                <Select value={promoteProjectId} onValueChange={setPromoteProjectId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choisir un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {refData.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" disabled={!promoteProjectId || isPromoting} onClick={onPromote}>
                  {isPromoting ? "..." : "Transformer"}
                </Button>
              </div>
            </div>
          )}

          <PersonalPlanningEntryFields form={form} refData={refData} idPrefix="edit" showMissionReport />

          <div className="space-y-2 rounded-md border p-3">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 text-left text-sm font-medium"
              onClick={toggleHistory}
            >
              {historyOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              Historique (§47)
            </button>
            {historyOpen &&
              (historyLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : (
                <PersonalPlanningHistory entries={history ?? []} />
              ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex-1" disabled={isPending || isDeleting || isDeletingSeries}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={isPending || isDeleting || isDeletingSeries}
              onClick={onDelete}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
            {entry.recurrenceGroupId && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                disabled={isPending || isDeleting || isDeletingSeries}
                onClick={onDeleteSeries}
              >
                {isDeletingSeries ? "Suppression..." : "Supprimer la série"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
