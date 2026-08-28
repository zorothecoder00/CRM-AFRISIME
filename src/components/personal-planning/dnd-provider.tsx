"use client";

import type { ReactNode } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useAction } from "@/hooks/use-action";
import { scheduleInboxTask, movePersonalPlanningEntry } from "@/actions/personal-planning.actions";

function combineDate(dateKey: string, hour: number | undefined, fallbackIso: string | undefined): Date {
  const d = new Date(`${dateKey}T00:00:00`);
  if (hour !== undefined) {
    d.setHours(hour, 0, 0, 0);
  } else if (fallbackIso) {
    const t = new Date(fallbackIso);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

/**
 * §13/§14 : glisser une tâche de l'inbox "À planifier" sur un créneau la
 * programme (scheduleInboxTask) ; glisser une activité déjà planifiée vers
 * un autre jour/heure la déplace (movePersonalPlanningEntry), en conservant
 * son heure d'origine si la cible ne précise qu'un jour (vue Semaine).
 */
export function PersonalPlanningDndProvider({ children }: { children: ReactNode }) {
  const { run: schedule } = useAction(scheduleInboxTask, {
    successMessage: (r) => (r.warnings.length > 0 ? `Planifiée — ${r.warnings.join(" ")}` : "Tâche planifiée."),
  });
  const { run: move } = useAction(movePersonalPlanningEntry, {
    successMessage: (r) => (r.warnings.length > 0 ? `Déplacée — ${r.warnings.join(" ")}` : "Activité déplacée."),
  });

  // Le bloc entier est désormais la zone de drag (voir EntryBlock) — un
  // seuil de déplacement évite qu'un simple clic (qui doit ouvrir l'édition)
  // soit interprété comme un début de glisser-déposer.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overData = over.data.current as { date?: string; hour?: number } | undefined;
    if (!overData?.date) return;

    if (activeId.startsWith("inbox-task-")) {
      const taskId = activeId.slice("inbox-task-".length);
      const dateDebut = combineDate(overData.date, overData.hour, undefined);
      void schedule({ taskId, dateDebut: dateDebut.toISOString(), dureeMinutes: 60 });
      return;
    }

    if (activeId.startsWith("entry-")) {
      const id = activeId.slice("entry-".length);
      const activeData = active.data.current as { originalDateDebut?: string } | undefined;
      const dateDebut = combineDate(overData.date, overData.hour, activeData?.originalDateDebut);
      void move({ id, newDateDebut: dateDebut.toISOString() });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
