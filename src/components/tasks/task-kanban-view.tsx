"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { updateTaskStatus } from "@/actions/task.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TaskRow } from "@/components/tasks/task-list-view";

const COLUMNS: { key: string; label: string }[] = [
  { key: "A_FAIRE", label: "À faire" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_REVISION", label: "En révision" },
  { key: "BLOQUEE", label: "Bloquée" },
  { key: "TERMINEE", label: "Terminée" },
];

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

function TaskCard({ task }: { task: TaskRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className={`mb-2 cursor-grab p-3 ${isDragging ? "opacity-50" : ""}`}>
        <Link href={`/taches/${task.id}`} className="text-sm font-medium hover:underline">
          {task.titre}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">{task.projectNom}</div>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {PRIORITY_LABELS[task.priorite]}
          </Badge>
          <span className="text-xs text-muted-foreground">{task.responsableNom}</span>
        </div>
      </Card>
    </div>
  );
}

function KanbanColumn({ columnKey, label, tasks }: { columnKey: string; label: string; tasks: TaskRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] w-64 flex-shrink-0 flex-col rounded-md border bg-muted/20 p-2 ${
        isOver ? "bg-muted/50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export function TaskKanbanView({ tasks: initialTasks }: { tasks: TaskRow[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.statut === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statut: newStatus } : t)));

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statut: task.statut } : t)));
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            tasks={tasks.filter((t) => t.statut === col.key)}
          />
        ))}
      </div>
    </DndContext>
  );
}
