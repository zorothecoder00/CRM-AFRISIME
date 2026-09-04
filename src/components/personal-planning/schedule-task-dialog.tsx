"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { scheduleInboxTask, suggestScheduleSlot } from "@/actions/personal-planning.actions";
import { CalendarPlus, RefreshCw, Sparkles } from "lucide-react";
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
 * Demande utilisateur — la date reste celle de l'échéance assignée à la
 * tâche : verrouillée ici, jamais éditable (un changement de date passe par
 * la demande de changement de date sur la fiche tâche). Seul le CRÉNEAU
 * horaire (heure de début/fin, pas une durée à saisir) est ajustable. Rien
 * n'est créé sans un clic explicite sur "Confirmer" (validation humaine,
 * voir suggestNextAvailableSlot).
 */
export function ScheduleTaskDialog({ taskId, titre }: { taskId: string; titre: string }) {
  const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [noSlotFound, setNoSlotFound] = useState(false);
  const [lastSuggestedEnd, setLastSuggestedEnd] = useState<string | null>(null);

  const { run: suggest, isPending: isSuggesting } = useAction(suggestScheduleSlot);
  const { run: confirm, isPending: isConfirming } = useAction(scheduleInboxTask, {
    successMessage: () => `« ${titre} » planifiée.`,
  });

  async function fetchSuggestion(after?: string) {
    setNoSlotFound(false);
    const result = await suggest({ taskId, after });
    if (!result.ok) return;
    if (!result.data) {
      setNoSlotFound(true);
      return;
    }
    const debut = new Date(result.data.dateDebut);
    const fin = new Date(result.data.dateFin);
    setDateKey(dateKeyOf(debut));
    setHeureDebut(timeOf(debut));
    setHeureFin(timeOf(fin));
    setLastSuggestedEnd(result.data.dateFin);
  }

  async function handleOpen() {
    setOpen(true);
    setDateKey(null);
    setHeureDebut("");
    setHeureFin("");
    setNoSlotFound(false);
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
        <DialogContent className="max-h-none overflow-y-visible sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier « {titre} »</DialogTitle>
          </DialogHeader>

          {isSuggesting && !dateKey && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Recherche du premier créneau libre…
            </p>
          )}
          {noSlotFound && (
            <p className="text-sm text-warning">
              Aucun créneau libre restant ce jour-là — ajustez l&apos;heure manuellement, ou faites une demande de
              changement de date depuis la fiche tâche si ce jour ne convient pas.
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
              <Label>Date d&apos;échéance</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{dateLabel ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">
                Fixée par l&apos;échéance de la tâche — pour la changer, faites une demande de changement de date
                depuis la fiche tâche.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`schedule-debut-${taskId}`}>Créneau</Label>
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
