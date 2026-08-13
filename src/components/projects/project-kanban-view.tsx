"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { useAction } from "@/hooks/use-action";
import { updateProjectStatus } from "@/actions/project.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toneForPriority, toneForStatus, accentForPriority, type BadgeTone } from "@/lib/status-tone";
import type { ProjectRow } from "@/components/projects/project-table-view";

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
  ghost: "border-t-border",
  link: "border-t-border",
};

const PRIORITY_LABELS: Record<string, string> = {
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  CRITIQUE: "Critique",
};

function ProjectCard({ project }: { project: ProjectRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card accent={accentForPriority(project.priorite)} className={`mb-2 cursor-grab p-3 ${isDragging ? "opacity-50" : ""}`}>
        <Link href={`/projets/${project.id}`} className="text-sm font-medium hover:underline">
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
    </div>
  );
}

function KanbanColumn({ columnKey, label, projects }: { columnKey: string; label: string; projects: ProjectRow[] }) {
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
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}

/** Vue Kanban (cahier des charges §VI) — projets groupes par statut, glisser-deposer pour changer de colonne. */
export function ProjectKanbanView({ projects: initialProjects }: { projects: ProjectRow[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const { run } = useAction(updateProjectStatus);

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
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.key} columnKey={col.key} label={col.label} projects={projects.filter((p) => p.statut === col.key)} />
        ))}
      </div>
    </DndContext>
  );
}
