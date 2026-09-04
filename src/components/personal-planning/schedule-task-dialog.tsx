"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { scheduleInboxTask, suggestScheduleSlot } from "@/actions/personal-planning.actions";
import { TaskDateChangeRequestDialog } from "@/components/tasks/task-date-change-request-dialog";
import { CalendarPlus, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeOf(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "Lier à une activité" (prototype V2, "À planifier") — propose
 * automatiquement le premier créneau libre (suggestScheduleSlot).
 *
 * Demande utilisateur — la date reste celle de début assignée à la
 * tâche : verrouillée ici, jamais éditable (un changement de date passe par
 * la demande de changement de date sur la fiche tâche). Le CRÉNEAU horaire
 * (heure de début/fin, pas une durée à saisir) est ajustable, mais s'affiche
 * d'abord en lecture seule (le vrai créneau proposé) — il faut cliquer sur
 * "Modifier" pour faire apparaître les champs éditables. Rien n'est créé
 * sans un clic explicite sur "Confirmer" (validation humaine, voir
 * suggestNextAvailableSlot).
 */
export function ScheduleTaskDialog({ taskId, titre }: { taskId: string; titre: string }) {
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [noSlotFound, setNoSlotFound] = useState(false);
  const [lastSuggestedEnd, setLastSuggestedEnd] = useState<string | null>(null);
  const [isEditingCreneau, setIsEditingCreneau] = useState(false);
  // Demande utilisateur — quand la journée assignée n'a plus de place,
  // propose directement le prochain créneau réellement libre (autre jour)
  // en appui d'une demande de changement de date, plutôt que de laisser
  // deviner quel jour conviendrait.
  const [alternative, setAlternative] = useState<{ dateDebut: string; dateFin: string } | null>(null);

  const { run: suggest, isPending: isSuggesting } = useAction(suggestScheduleSlot);
  const { run: confirm, isPending: isConfirming } = useAction(scheduleInboxTask, {
    successMessage: () => `« ${titre} » planifiée.`,
  });

  async function fetchSuggestion(after?: string) {
    setNoSlotFound(false);
    setAlternative(null);
    const result = await suggest({ taskId, after });
    if (!result.ok) return;
    if (!result.data) {
      // N'arrive que si la tâche n'a même pas de date de début assignée ET
      // qu'aucun créneau libre n'existe dans les 3 prochaines semaines (cas
      // très rare) — rien à verrouiller ni à proposer manuellement ici.
      setNoSlotFound(true);
      return;
    }
    // Demande utilisateur — même sans créneau libre trouvé ce jour-là (jour
    // chargé), la date reste verrouillée et connue (anchorDate) : on bascule
    // alors directement en édition manuelle au lieu de bloquer "Confirmer"
    // indéfiniment faute de date. La saisie manuelle reste ensuite soumise
    // au même contrôle de conflit que la suggestion (voir scheduleInboxTask),
    // qui indique précisément l'activité en cause si ça chevauche.
    setDateKey(dateKeyOf(new Date(result.data.anchorDate)));
    if (result.data.dateDebut && result.data.dateFin) {
      const debut = new Date(result.data.dateDebut);
      const fin = new Date(result.data.dateFin);
      setHeureDebut(timeOf(debut));
      setHeureFin(timeOf(fin));
      setLastSuggestedEnd(result.data.dateFin);
      // Un nouveau créneau proposé revient toujours en lecture seule d'abord
      // (demande utilisateur) — pas d'édition qui survivrait à un rafraîchissement.
      setIsEditingCreneau(false);
      setNoSlotFound(false);
    } else {
      setHeureDebut("");
      setHeureFin("");
      setLastSuggestedEnd(null);
      setIsEditingCreneau(true);
      setNoSlotFound(true);
      setAlternative(result.data.alternative ?? null);
    }
  }

  async function handleOpen() {
    setOpen(true);
    setDateKey(null);
    setHeureDebut("");
    setHeureFin("");
    setNoSlotFound(false);
    setAlternative(null);
    setIsEditingCreneau(false);
    await fetchSuggestion();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateKey || !heureDebut || !heureFin) return;

    const [y, m, d] = dateKey.split("-").map(Number);
    const [hDebut, mDebut] = heureDebut.split(":").map(Number);
    const [hFin, mFin] = heureFin.split(":").map(Number);
    const dateDebut = new Date(y, m - 1, d, hDebut, mDebut);
    const dureeMinutes = Math.round((new Date(y, m - 1, d, hFin, mFin).getTime() - dateDebut.getTime()) / 60_000);
    if (dureeMinutes <= 0) {
      toast.error("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const result = await confirm({ taskId, dateDebut: dateDebut.toISOString(), dureeMinutes });
    if (result.ok) {
      result.data.warnings.forEach((w) => toast.warning(w));
      setOpen(false);
    }
  }

  const dateLabel = dateKey
    ? new Date(`${dateKey}T00:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Button size="xs" variant="default" onClick={handleOpen}>
        <CalendarPlus className="mr-1 h-3 w-3" />
        Transformer en activité
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier « {titre} »</DialogTitle>
          </DialogHeader>

          {isSuggesting && !dateKey && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Recherche du premier créneau libre…
            </p>
          )}
          {noSlotFound && dateKey && (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-2.5">
              <p className="text-sm text-warning">
                Aucun créneau libre restant ce jour-là — choisissez vous-même une heure ci-dessous (un conflit vous
                sera signalé précisément si besoin).
              </p>
              {alternative && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Prochain créneau réellement libre :{" "}
                    <span className="font-medium text-foreground">
                      {new Date(alternative.dateDebut).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      de {timeOf(new Date(alternative.dateDebut))} à {timeOf(new Date(alternative.dateFin))}
                    </span>
                    .
                  </p>
                  <TaskDateChangeRequestDialog
                    taskId={taskId}
                    currentDateDebut={dateKey}
                    suggestedDateDebut={alternative.dateDebut}
                    trigger={
                      <Button type="button" variant="outline" size="xs">
                        Demander ce report de date
                      </Button>
                    }
                  />
                </>
              )}
            </div>
          )}
          {noSlotFound && !dateKey && (
            <p className="text-sm text-warning">
              Aucun créneau libre trouvé dans les 3 prochaines semaines — faites une demande de changement de date
              depuis la fiche tâche.
            </p>
          )}
          {!isSuggesting && dateKey && !noSlotFound && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              Créneau libre proposé automatiquement — ajustez l&apos;heure si besoin.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date de début</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{dateLabel ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">
                Fixée par la date de début de la tâche — pour la changer, faites une demande de changement de date
                depuis la fiche tâche.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={isEditingCreneau ? `schedule-debut-${taskId}` : undefined}>Créneau</Label>
                {!isEditingCreneau && heureDebut && heureFin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCreneau(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </button>
                )}
              </div>
              {isEditingCreneau ? (
                <div className="flex items-center gap-2">
                  <Input
                    id={`schedule-debut-${taskId}`}
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    id={`schedule-fin-${taskId}`}
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    required
                    className="flex-1"
                  />
                </div>
              ) : (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {heureDebut && heureFin ? `${heureDebut} → ${heureFin}` : "—"}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSuggesting}
                onClick={() => fetchSuggestion(lastSuggestedEnd ?? undefined)}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Autre créneau
              </Button>
              <Button type="submit" className="flex-1" disabled={isConfirming || !dateKey || !heureDebut || !heureFin}>
                {isConfirming ? "Planification..." : "Confirmer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
