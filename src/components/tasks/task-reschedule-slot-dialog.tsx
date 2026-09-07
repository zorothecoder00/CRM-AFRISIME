"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { rescheduleTaskSlot, checkScheduleSlot } from "@/actions/personal-planning.actions";
import { CalendarClock, Sparkles, TriangleAlert } from "lucide-react";

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
 * Demande utilisateur — une fois la tâche planifiée (créneau posé via
 * ScheduleTaskDialog), elle disparaît de "à planifier" : plus aucun moyen
 * d'ajuster son créneau (libérer l'heure pour autre chose) sans aller
 * chercher le bon bloc dans la grille hebdomadaire. Même verrou de date que
 * ScheduleTaskDialog — seule l'heure est modifiable ici, un changement de
 * jour reste une demande de changement de date (TaskDateChangeRequestDialog).
 */
export function TaskRescheduleSlotDialog({
  taskId,
  entryId,
  currentDateDebut,
  currentDateFin,
}: {
  taskId: string;
  entryId: string;
  currentDateDebut: string;
  currentDateFin: string;
}) {
  const [open, setOpen] = useState(false);
  const debut = new Date(currentDateDebut);
  const fin = new Date(currentDateFin);
  const dateKey = dateKeyOf(debut);
  const [heureDebut, setHeureDebut] = useState(timeOf(debut));
  const [heureFin, setHeureFin] = useState(timeOf(fin));
  const [slotCheck, setSlotCheck] = useState<{ checking: boolean; message: string | null }>({ checking: false, message: null });

  const { run: reschedule, isPending } = useAction(rescheduleTaskSlot, { successMessage: "Créneau modifié." });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setHeureDebut(timeOf(debut));
      setHeureFin(timeOf(fin));
      setSlotCheck({ checking: false, message: null });
    }
  }

  // Un créneau inchangé n'a pas besoin d'être re-vérifié (il n'entre en
  // conflit qu'avec lui-même sinon — exclu côté serveur via entryId, mais
  // autant éviter l'appel). Sert aussi de condition d'affichage : un
  // résultat périmé ne s'affiche jamais si la saisie n'est plus vérifiable,
  // sans avoir à le remettre à zéro synchronement dans l'effet.
  const canCheckSlot =
    open && !!heureDebut && !!heureFin && heureFin > heureDebut && (heureDebut !== timeOf(debut) || heureFin !== timeOf(fin));

  useEffect(() => {
    if (!canCheckSlot) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSlotCheck({ checking: true, message: null });
      const [y, m, d] = dateKey.split("-").map(Number);
      const [hDebut, mDebut] = heureDebut.split(":").map(Number);
      const [hFin, mFin] = heureFin.split(":").map(Number);
      const newDebut = new Date(y, m - 1, d, hDebut, mDebut);
      const dureeMinutes = Math.round((new Date(y, m - 1, d, hFin, mFin).getTime() - newDebut.getTime()) / 60_000);
      try {
        const result = await checkScheduleSlot({ dateDebut: newDebut.toISOString(), dureeMinutes, excludeEntryId: entryId });
        if (!cancelled) setSlotCheck({ checking: false, message: result.available ? null : result.message });
      } catch {
        if (!cancelled) setSlotCheck({ checking: false, message: null });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canCheckSlot, heureDebut, heureFin, dateKey, entryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!heureDebut || !heureFin) return;
    const [y, m, d] = dateKey.split("-").map(Number);
    const [hDebut, mDebut] = heureDebut.split(":").map(Number);
    const [hFin, mFin] = heureFin.split(":").map(Number);
    const newDebut = new Date(y, m - 1, d, hDebut, mDebut);
    const dureeMinutes = Math.round((new Date(y, m - 1, d, hFin, mFin).getTime() - newDebut.getTime()) / 60_000);
    if (dureeMinutes <= 0) return;

    const result = await reschedule({ taskId, dateDebut: newDebut.toISOString(), dureeMinutes });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarClock className="mr-1 h-3.5 w-3.5" />
          Modifier le créneau
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le créneau</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {debut.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Fixée par la date de début de la tâche — pour la changer, faites une demande de changement de date
              depuis la fiche tâche.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reschedule-debut-${taskId}`}>Créneau</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`reschedule-debut-${taskId}`}
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                required
                className="flex-1"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                id={`reschedule-fin-${taskId}`}
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                required
                className="flex-1"
              />
            </div>
            {canCheckSlot && slotCheck.checking && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Vérification de la disponibilité…
              </p>
            )}
            {canCheckSlot && !slotCheck.checking && slotCheck.message && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {slotCheck.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !heureDebut || !heureFin || (canCheckSlot && (slotCheck.checking || !!slotCheck.message))}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
