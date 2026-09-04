"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { rescheduleMeeting, suggestMeetingSlot } from "@/actions/meeting.actions";
import { CalendarClock, RefreshCw, Sparkles } from "lucide-react";

/** "YYYY-MM-DDTHH:mm" en HEURE LOCALE (pas toISOString, qui décale en UTC) — format attendu par <input type="datetime-local">. */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Demande utilisateur — replanifier une réunion (aucune fonctionnalité de
 * ce type n'existait avant). Même principe que ScheduleTaskDialog pour les
 * tâches : propose automatiquement le premier créneau libre de
 * l'organisateur (suggestMeetingSlot), champ éditable, rien n'est appliqué
 * sans un clic explicite sur "Confirmer".
 */
export function RescheduleMeetingDialog({ meetingId, titre }: { meetingId: string; titre: string }) {
  const [open, setOpen] = useState(false);
  const [dateHeure, setDateHeure] = useState("");
  const [noSlotFound, setNoSlotFound] = useState(false);
  const [lastSuggested, setLastSuggested] = useState<string | null>(null);

  const { run: suggest, isPending: isSuggesting } = useAction(suggestMeetingSlot);
  const { run: confirm, isPending: isConfirming } = useAction(rescheduleMeeting, {
    successMessage: "Réunion replanifiée.",
  });

  async function fetchSuggestion(after?: string) {
    setNoSlotFound(false);
    const result = await suggest({ meetingId, after });
    if (!result.ok) return;
    if (!result.data) {
      setNoSlotFound(true);
      return;
    }
    setDateHeure(toDatetimeLocalValue(new Date(result.data.dateDebut)));
    setLastSuggested(result.data.dateDebut);
  }

  async function handleOpen() {
    setOpen(true);
    setDateHeure("");
    setNoSlotFound(false);
    await fetchSuggestion();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateHeure) return;
    const result = await confirm({ meetingId, dateHeure });
    if (result.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <CalendarClock className="mr-1 h-3.5 w-3.5" />
        Replanifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replanifier « {titre} »</DialogTitle>
          </DialogHeader>

          {isSuggesting && !dateHeure && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Recherche du premier créneau libre…
            </p>
          )}
          {noSlotFound && (
            <p className="text-sm text-warning">
              Aucun créneau libre trouvé dans les 3 prochaines semaines — choisissez une date manuellement.
            </p>
          )}
          {!isSuggesting && dateHeure && !noSlotFound && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              Créneau libre proposé automatiquement (selon votre charge et vos horaires) — ajustez-le si besoin.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`reschedule-date-${meetingId}`}>Nouvelle date et heure</Label>
              <Input
                id={`reschedule-date-${meetingId}`}
                type="datetime-local"
                value={dateHeure}
                onChange={(e) => setDateHeure(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isSuggesting}
                onClick={() => fetchSuggestion(lastSuggested ?? undefined)}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Autre créneau
              </Button>
              <Button type="submit" className="flex-1" disabled={isConfirming || !dateHeure}>
                {isConfirming ? "Replanification..." : "Confirmer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
