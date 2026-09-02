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

/** "YYYY-MM-DDTHH:mm" en HEURE LOCALE (pas toISOString, qui décale en UTC) — format attendu par <input type="datetime-local">. */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * "Lier à une activité" (prototype V2, "À planifier") — au lieu d'un
 * formulaire manuel vide, propose automatiquement le premier créneau libre
 * (suggestScheduleSlot) ; les champs restent éditables pour un ajustement
 * manuel, et rien n'est créé sans un clic explicite sur "Confirmer"
 * (validation humaine, voir suggestNextAvailableSlot).
 */
export function ScheduleTaskDialog({ taskId, titre }: { taskId: string; titre: string }) {
  const [open, setOpen] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState(60);
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
    setDateDebut(toDatetimeLocalValue(new Date(result.data.dateDebut)));
    setDureeMinutes(result.data.dureeMinutes);
    setLastSuggestedEnd(result.data.dateFin);
  }

  async function handleOpen() {
    setOpen(true);
    setDateDebut("");
    setNoSlotFound(false);
    await fetchSuggestion();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateDebut) return;
    const result = await confirm({ taskId, dateDebut, dureeMinutes });
    if (result.ok) {
      result.data.warnings.forEach((w) => toast.warning(w));
      setOpen(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <CalendarPlus className="mr-1 h-3.5 w-3.5" />
        Lier à une activité
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-none overflow-y-visible sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier « {titre} »</DialogTitle>
          </DialogHeader>

          {isSuggesting && !dateDebut && (
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
          {!isSuggesting && dateDebut && !noSlotFound && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
              Créneau libre proposé automatiquement — ajustez-le si besoin.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`schedule-date-${taskId}`}>Date et heure</Label>
              <Input
                id={`schedule-date-${taskId}`}
                type="datetime-local"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`schedule-duree-${taskId}`}>Durée (minutes)</Label>
              <Input
                id={`schedule-duree-${taskId}`}
                type="number"
                min={15}
                step={15}
                value={dureeMinutes}
                onChange={(e) => setDureeMinutes(Number(e.target.value))}
              />
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
              <Button type="submit" className="flex-1" disabled={isConfirming || !dateDebut}>
                {isConfirming ? "Planification..." : "Confirmer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
