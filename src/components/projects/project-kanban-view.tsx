"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { useAction } from "@/hooks/use-action";
import { updateProjectStatus } from "@/actions/project.actions";
import { deleteProject } from "@/actions/trash.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { toneForPriority, toneForStatus, accentForPriority, type BadgeTone } from "@/lib/status-tone";
import type { ProjectRow } from "@/components/projects/project-table-view";

type Option = { id: string; label: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "PLANIFIE", label: "Planifié" },
  { key: "EN_COURS", label: "En cours" },
  { key: "EN_PAUSE", label: "En pause" },
  { key: "TERMINE", label: "Terminé" },
  { key: "ANNULE", label: "Annulé" },
];

const COLUMN_ACCENT: Record<BadgeTone, string> = {
  default: "border-t-border",
  secondary: "border-t-border",
  destructive: "border-t-destructive",
  success: "border-t-success",
  warning: "border-t-warning",
  info: "border-t-info",
  outline: "border-t-border",
  violet: "border-t-violet-500",
  ghost: "border-t-border",
  link: "border-t-border",
};

const PRIORITY_LABELS: Record<string, string> = {
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  CRITIQUE: "Critique",
};

function ProjectCard({
  project,
  departments,
  users,
  canManage,
  canDelete,
  onDeleted,
  onUpdated,
}: {
  project: ProjectRow;
  departments: Option[];
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { nom: string; priorite: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const [editing, setEditing] = useState(false);
  const { run: remove } = useAction(deleteProject, { successMessage: "Projet supprimé." });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  async function handleDelete() {
    const result = await remove(project.id);
    if (result.ok) onDeleted(project.id);
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card accent={accentForPriority(project.priorite)} className={`relative mb-2 cursor-grab p-3 ${isDragging ? "opacity-50" : ""}`}>
        {(canManage || canDelete) && (
          <div className="absolute top-1 right-1">
            <RowActionsMenu
              onEdit={canManage ? () => setEditing(true) : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              deleteConfirmLabel={`Supprimer « ${project.nom} » ? Le projet sera déplacé dans la corbeille.`}
            />
          </div>
        )}
        <Link href={`/projets/${project.id}`} className="pr-6 text-sm font-medium hover:underline">
          {project.nom}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">{project.departmentNom}</div>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant={toneForPriority(project.priorite)} className="text-xs">
            {PRIORITY_LABELS[project.priorite]}
          </Badge>
          <span className="text-xs text-muted-foreground">{project.avancement}%</span>
        </div>
      </Card>
      {editing && (
        <ProjectEditDialog
          project={project}
          departments={departments}
          users={users}
          open={editing}
          onOpenChange={setEditing}
          onSuccess={(updated) => onUpdated(project.id, { nom: updated.nom, priorite: updated.priorite })}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  columnKey,
  label,
  projects,
  departments,
  users,
  canManage,
  canDelete,
  onDeleted,
  onUpdated,
}: {
  columnKey: string;
  label: string;
  projects: ProjectRow[];
  departments: Option[];
  users: Option[];
  canManage: boolean;
  canDelete: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, patch: { nom: string; priorite: string }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  const accent = COLUMN_ACCENT[toneForStatus(columnKey)];

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] w-64 flex-shrink-0 flex-col rounded-md border border-t-2 bg-muted/20 p-2 ${accent} ${
        isOver ? "bg-muted/50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary">{projects.length}</Badge>
      </div>
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          departments={departments}
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

/** Vue Kanban (cahier des charges §VI) — projets groupes par statut, glisser-deposer pour changer de colonne. */
export function ProjectKanbanView({
  projects: initialProjects,
  departments = [],
  users = [],
  canManage = false,
  canDelete = false,
}: {
  projects: ProjectRow[];
  departments?: Option[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const { run } = useAction(updateProjectStatus);

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleUpdated(id: string, patch: { nom: string; priorite: string }) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as string;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.statut === newStatus) return;

    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, statut: newStatus } : p)));

    const result = await run(projectId, newStatus);
    if (!result.ok) {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, statut: project.statut } : p)));
    }
  }

  return (
    <DndContext id="project-kanban" onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            projects={projects.filter((p) => p.statut === col.key)}
            departments={departments}
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
