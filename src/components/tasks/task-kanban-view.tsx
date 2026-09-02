"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useAction } from "@/hooks/use-action";
import { updateTaskStatus } from "@/actions/task.actions";
import { deleteTask } from "@/actions/trash.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { toneForPriority, toneForTaskStatus, accentForPriority, type BadgeTone } from "@/lib/status-tone";
import type { TaskRow } from "@/components/tasks/task-list-view";

type Option = { id: string; label: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "A_FAIRE", label: "À faire" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_REVISION", label: "En révision" },
  { key: "BLOQUEE", label: "Bloquée" },
  { key: "TERMINEE", label: "Terminée" },
];

// Barre d'accent en tete de colonne : reprend la teinte de statut pour que
// chaque etape du kanban se distingue au premier coup d'oeil (au lieu de
// colonnes toutes identiques en gris).
const COLUMN_ACCENT: Record<BadgeTone, string> = {
  default: "border-t-border",
  secondary: "border-t-border",
  destructive: "border-t-destructive",
  success: "border-t-success",
  warning: "border-t-warning",
  info: "border-t-info",
  outline: "border-t-border",
  ghost: "border-t-border",
  link: "border-t-border",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

function TaskCard({
  task,
  users,
  canManage,
  canDelete,
  onDeleted,
  onUpdated,
}: {
  task: TaskRow;
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { titre: string; priorite: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const [editing, setEditing] = useState(false);
  const { run: remove } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  async function handleDelete() {
    const result = await remove(task.id);
    if (result.ok) onDeleted(task.id);
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        accent={accentForPriority(task.priorite)}
        className={`relative mb-2 cursor-grab p-3 ${isDragging ? "opacity-50" : ""}`}
      >
        {(canManage || canDelete) && (
          <div className="absolute top-1 right-1">
            <RowActionsMenu
              onEdit={canManage ? () => setEditing(true) : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              deleteConfirmLabel={`Supprimer « ${task.titre} » ? La tâche sera déplacée dans la corbeille.`}
            />
          </div>
        )}
        <Link href={`/taches/${task.id}`} className="pr-6 text-sm font-medium hover:underline">
          {task.titre}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">{task.projectNom}</div>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant={toneForPriority(task.priorite)} className="text-xs">
            {PRIORITY_LABELS[task.priorite]}
          </Badge>
          <span className="text-xs text-muted-foreground">{task.responsableNom}</span>
        </div>
      </Card>
      {editing && (
        <TaskEditDialog
          task={task}
          users={users}
          open={editing}
          onOpenChange={setEditing}
          onSuccess={(updated) => onUpdated(task.id, { titre: updated.titre, priorite: updated.priorite })}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  columnKey,
  label,
  tasks,
  users,
  canManage,
  canDelete,
  onDeleted,
  onUpdated,
}: {
  columnKey: string;
  label: string;
  tasks: TaskRow[];
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { titre: string; priorite: string }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  const accent = COLUMN_ACCENT[toneForTaskStatus(columnKey)];

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] w-64 flex-shrink-0 flex-col rounded-md border border-t-2 bg-muted/20 p-2 ${accent} ${
        isOver ? "bg-muted/50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          users={users}
          canManage={canManage}
          canDelete={canDelete}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

export function TaskKanbanView({
  tasks: initialTasks,
  users = [],
  canManage = false,
  canDelete = false,
}: {
  tasks: TaskRow[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const { run } = useAction(updateTaskStatus);

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleUpdated(id: string, patch: { titre: string; priorite: string }) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.statut === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statut: newStatus } : t)));

    const result = await run(taskId, newStatus);
    if (!result.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statut: task.statut } : t)));
    }
  }

  return (
    <DndContext id="task-kanban" onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            tasks={tasks.filter((t) => t.statut === col.key)}
            users={users}
            canManage={canManage}
            canDelete={canDelete}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
          />
        ))}
      </div>
    </DndContext>
  );
}
