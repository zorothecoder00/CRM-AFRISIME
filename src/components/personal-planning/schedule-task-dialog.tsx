"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction } from "@/hooks/use-action";
import { scheduleInboxTask } from "@/actions/personal-planning.actions";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

/**
 * "Lier à une activité" (§13/§14) : la seule façon de planifier une tâche
 * de l'inbox était de la glisser-déposer sur les vues Jour/Semaine — ce
 * formulaire appelle le même `scheduleInboxTask`, pour planifier une tâche
 * sans passer par le calendrier (utile depuis /planning-personnel/a-planifier,
 * qui n'a pas de grille horaire).
 */
export function ScheduleTaskDialog({ taskId, titre }: { taskId: string; titre: string }) {
  const [open, setOpen] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState(60);
  const { run, isPending } = useAction(scheduleInboxTask, {
    successMessage: () => `« ${titre} » planifiée.`,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateDebut) return;
    const result = await run({ taskId, dateDebut, dureeMinutes });
    if (result.ok) {
      result.data.warnings.forEach((w) => toast.warning(w));
      setOpen(false);
      setDateDebut("");
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="mr-1 h-3.5 w-3.5" />
        Lier à une activité
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Planifier « {titre} »</DialogTitle>
          </DialogHeader>
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
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Planification..." : "Planifier"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
