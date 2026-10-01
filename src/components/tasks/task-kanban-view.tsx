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
import { toneForPriority } from "@/lib/status-tone";
import { materialTone } from "@/lib/card-tones";
import type { TaskRow } from "@/components/tasks/task-list-view";

type Option = { id: string; label: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "A_FAIRE", label: "À faire" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_REVISION", label: "En révision" },
  { key: "BLOQUEE", label: "Bloquée" },
  { key: "REPORTEE", label: "Reportée" },
  { key: "TERMINEE", label: "Terminée" },
];

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
  currentUserId,
  tone,
}: {
  task: TaskRow;
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { titre: string; priorite: string }) => void;
  currentUserId?: string;
  tone: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const [editing, setEditing] = useState(false);
  const { run: remove, isPending: removing } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  async function handleDelete() {
    const result = await remove(task.id);
    if (result.ok) onDeleted(task.id);
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {/* Demande utilisateur — plus de barre d'accent (priorite deja visible via le badge),
          fond Material Design : une teinte par colonne (voir KanbanColumn). */}
      <Card
        className={`relative mb-2 cursor-grab p-3 ${tone} ${isDragging ? "opacity-50" : ""}`}
      >
        {(canManage || canDelete) && (
          <div className="absolute top-1 right-1">
            <RowActionsMenu
              onEdit={canManage ? () => setEditing(true) : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              deleteConfirmLabel={`Supprimer « ${task.titre} » ? La tâche sera déplacée dans la corbeille.`}
              deleteDisabled={removing}
            />
          </div>
        )}
        <Link href={`/taches/${task.id}`} className="pr-6 text-sm font-medium hover:underline">
          {task.titre}
        </Link>
        {/* Demande utilisateur — donnees de la carte sur le gris du site
            (bg-background) plutot que sur la teinte Material de la carte. */}
        <div className="mt-2 space-y-2 rounded-md bg-background p-2">
          <div className="text-xs text-muted-foreground">{task.projectNom}</div>
          <div className="flex items-center justify-between">
            <Badge variant={toneForPriority(task.priorite)} className="text-xs">
              {PRIORITY_LABELS[task.priorite]}
            </Badge>
            <span className="text-xs text-muted-foreground">{task.responsableNom}</span>
          </div>
        </div>
      </Card>
      {editing && (
        <TaskEditDialog
          task={task}
          users={users}
          isOwner={!!currentUserId && task.responsablePrincipalId === currentUserId}
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
  currentUserId,
  tone,
}: {
  columnKey: string;
  label: string;
  tasks: TaskRow[];
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { titre: string; priorite: string }) => void;
  currentUserId?: string;
  tone: string;
}) {
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
        <TaskCard
          key={task.id}
          task={task}
          users={users}
          canManage={canManage}
          canDelete={canDelete}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
          currentUserId={currentUserId}
          tone={tone}
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
  currentUserId,
}: {
  tasks: TaskRow[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
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
        {COLUMNS.map((col, i) => (
          <KanbanColumn
            key={col.key}
            tone={materialTone(i)}
            columnKey={col.key}
            label={col.label}
            tasks={tasks.filter((t) => t.statut === col.key)}
            users={users}
            canManage={canManage}
            canDelete={canDelete}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </DndContext>
  );
}
