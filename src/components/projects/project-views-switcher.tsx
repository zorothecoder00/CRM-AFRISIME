"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toneForTaskStatus } from "@/lib/status-tone";
import { HierarchyTree, type SectionNode } from "@/components/projects/hierarchy-tree";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";
import { TaskListView } from "@/components/tasks/task-list-view";
import { TaskTimelineView } from "@/components/tasks/task-timeline-view";
import { TaskGanttView, type GanttTaskRow, type GanttDependency } from "@/components/tasks/task-gantt-view";
import { TaskMindMapView, type MindMapTaskRow } from "@/components/tasks/task-mindmap-view";
import { ProjectTasksCalendarView } from "@/components/projects/project-tasks-calendar-view";
import { ProjectPilotagePanel } from "@/components/projects/project-pilotage-panel";
import { WorkloadTable } from "@/components/workload/workload-table";
import type { UserWorkload } from "@/lib/workload";
import type { ProjectPilotage } from "@/lib/project-pilotage";
import { ProjectMapLoader } from "@/components/projects/project-map-loader";

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

type Option = { id: string; label: string };

type MapProjectInfo = {
  id: string;
  nom: string;
  statut: string;
  avancement: number;
  localisation: string | null;
  latitude: number;
  longitude: number;
};

const VIEWS = [
  { key: "liste", label: "Liste" },
  { key: "kanban", label: "Kanban" },
  { key: "gantt", label: "Gantt" },
  { key: "timeline", label: "Timeline" },
  { key: "calendrier", label: "Calendrier" },
  { key: "table", label: "Table" },
  { key: "workload", label: "Workload" },
  { key: "mindmap", label: "Mind Map" },
  { key: "wbs", label: "WBS" },
  { key: "dashboard", label: "Dashboard" },
  { key: "carte", label: "Carte" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

/**
 * Vue unifiée du projet (cahier des charges Project Studio §41 — "Multiples
 * vues") : un même projet consultable en Liste / Kanban / Gantt / Timeline /
 * Calendrier / Table / Workload / Mind Map / WBS / Dashboard / Carte, sans
 * quitter la fiche projet. Réutilise les composants déjà validés ailleurs
 * (module Tâches §7, WBS, Pilotage, Workload, Carte) plutôt que de dupliquer
 * leur logique.
 */
export function ProjectViewsSwitcher({
  projectId,
  tasks,
  dependencies,
  mindMapTasks,
  roots,
  userOptions,
  tocNodeOptions = [],
  pilotage,
  devise,
  workload,
  canManageWorkload,
  mapProject,
}: {
  projectId: string;
  tasks: GanttTaskRow[];
  dependencies: GanttDependency[];
  mindMapTasks: MindMapTaskRow[];
  roots: SectionNode[];
  userOptions: Option[];
  tocNodeOptions?: Option[];
  pilotage: ProjectPilotage;
  devise: string;
  workload: UserWorkload[] | null;
  canManageWorkload: boolean;
  mapProject: MapProjectInfo | null;
}) {
  const availableViews = VIEWS.filter((v) => {
    if (v.key === "workload") return workload !== null;
    if (v.key === "carte") return mapProject !== null;
    return true;
  });
  const [view, setView] = useState<ViewKey>("liste");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-md border p-1">
        {availableViews.map((v) => (
          <Button
            key={v.key}
            type="button"
            variant={view === v.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setView(v.key)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      {view === "liste" && (
        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche pour ce projet.</p>}
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/taches/${task.id}`}
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
            >
              <span className="font-medium">{task.titre}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{task.responsableNom}</span>
                <Badge variant={toneForTaskStatus(task.statut)}>{TASK_STATUS_LABELS[task.statut]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {view === "kanban" && <TaskKanbanView tasks={tasks} />}
      {view === "gantt" && <TaskGanttView tasks={tasks} dependencies={dependencies} />}
      {view === "timeline" && <TaskTimelineView tasks={tasks} />}
      {view === "calendrier" && <ProjectTasksCalendarView tasks={tasks} />}
      {view === "table" && <TaskListView tasks={tasks} />}
      {view === "workload" &&
        (workload === null || workload.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre rattaché à ce projet.</p>
        ) : (
          <WorkloadTable rows={workload} canManage={canManageWorkload} />
        ))}
      {view === "mindmap" && <TaskMindMapView tasks={mindMapTasks} />}
      {view === "wbs" && <HierarchyTree nodes={roots} projectId={projectId} users={userOptions} tocNodes={tocNodeOptions} />}
      {view === "dashboard" && <ProjectPilotagePanel pilotage={pilotage} devise={devise} />}
      {view === "carte" &&
        (mapProject ? (
          <ProjectMapLoader projects={[mapProject]} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune localisation renseignée pour ce projet — ajoutez une latitude/longitude dans l&apos;aperçu.
          </p>
        ))}
    </div>
  );
}
