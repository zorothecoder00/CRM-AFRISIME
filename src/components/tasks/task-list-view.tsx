"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useAction } from "@/hooks/use-action";
import { deleteTask } from "@/actions/trash.actions";
import { Badge } from "@/components/ui/badge";
import { toneForTaskStatus, toneForPriority } from "@/lib/status-tone";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { AddSubtaskDialog } from "@/components/tasks/add-subtask-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { TaskPrioritySelect } from "@/components/tasks/task-priority-select";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Option = { id: string; label: string };

export type TaskRow = {
  id: string;
  titre: string;
  description: string | null;
  projectNom: string;
  statut: string;
  priorite: string;
  responsablePrincipalId: string;
  responsableNom: string;
  dateDebut?: string | null;
  echeance: string | null;
  tempsEstimeHeures: number | null;
  avancement: number;
  // Rempli uniquement pour le planning personnel (showCreneau) : plage
  // horaire réelle de la session PersonalPlanningEntry qui planifie cette
  // tâche (§4/§10) — la seule/prochaine à venir, sinon la dernière passée.
  creneau?: { debut: string; fin: string } | null;
};

// Demande utilisateur : la colonne "Créneau" du tableau mes-tâches
// n'affiche QUE la plage horaire, jamais la date (contrairement à
// l'ancienne colonne "Créneau" qui préfixait la date si ce n'était pas
// aujourd'hui) — la date de la tâche est déjà dans la colonne "Échéance".
function formatCreneauRange(creneau: { debut: string; fin: string }): string {
  const heureDebut = new Date(creneau.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const heureFin = new Date(creneau.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${heureDebut}–${heureFin}`;
}

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

const TITRE_CELL = ({ row }: { row: { original: TaskRow } }) => (
  <Link href={`/taches/${row.original.id}`} className="font-medium hover:underline">
    {row.original.titre}
  </Link>
);

const ECHEANCE_CELL = ({ row }: { row: { original: TaskRow } }) =>
  row.original.echeance ? new Date(row.original.echeance).toLocaleDateString("fr-FR") : "—";

function priorityCell(row: { original: TaskRow }, canManage: boolean) {
  return canManage ? (
    <TaskPrioritySelect taskId={row.original.id} priorite={row.original.priorite} />
  ) : (
    <Badge variant={toneForPriority(row.original.priorite)}>{PRIORITY_LABELS[row.original.priorite]}</Badge>
  );
}

function statutCell(row: { original: TaskRow }, canManage: boolean) {
  return canManage ? (
    <TaskStatusSelect taskId={row.original.id} statut={row.original.statut} />
  ) : (
    <Badge variant={toneForTaskStatus(row.original.statut)}>{STATUS_LABELS[row.original.statut]}</Badge>
  );
}

function actionsColumn(options: {
  canManage: boolean;
  canDelete: boolean;
  canAddSubtask: boolean;
  onEdit: (id: string) => void;
  onAddSubtask: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}): ColumnDef<TaskRow> {
  return {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <RowActionsMenu
        onEdit={options.canManage ? () => options.onEdit(row.original.id) : undefined}
        onAddSubtask={options.canAddSubtask ? () => options.onAddSubtask(row.original) : undefined}
        onDelete={options.canDelete ? () => options.onDelete(row.original) : undefined}
        deleteConfirmLabel={`Supprimer « ${row.original.titre} » ? La tâche sera déplacée dans la corbeille.`}
      />
    ),
  };
}

function buildColumns(options: {
  canManage: boolean;
  canDelete: boolean;
  // Demande utilisateur — "Subdiviser en sous-tâches" est autorisé côté
  // serveur par TASK_CREATE (scopé), pas TASK_UPDATE (voir addSubtask) :
  // séparé de canManage pour ne pas cacher l'action à qui a la main sur la
  // création de tâches de son projet sans avoir TASK_UPDATE globalement.
  // Par défaut = canManage (comportement historique inchangé sur /taches).
  canAddSubtask: boolean;
  showCreneau: boolean;
  onEdit: (id: string) => void;
  onAddSubtask: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}): ColumnDef<TaskRow>[] {
  // Planning personnel (§4/§10, showCreneau) : disposition dédiée demandée
  // par l'utilisateur — Créneau/Tâche/Échéance/Priorité/Statut/%/Projet.
  // Créneau = plage horaire seule (pas de date, voir formatCreneauRange) ;
  // Projet en dernier (remplace l'ancienne colonne "Créneau" complète,
  // devenue redondante avec Échéance + ce nouveau Créneau).
  if (options.showCreneau) {
    const cols: ColumnDef<TaskRow>[] = [
      {
        accessorKey: "creneau",
        id: "creneau",
        header: "Créneau",
        cell: ({ row }) => (
          <span className={row.original.creneau ? undefined : "text-muted-foreground"}>
            {row.original.creneau ? formatCreneauRange(row.original.creneau) : "Non planifiée"}
          </span>
        ),
      },
      { accessorKey: "titre", header: "Tâche", cell: TITRE_CELL },
      { accessorKey: "echeance", header: "Échéance", cell: ECHEANCE_CELL },
      { accessorKey: "priorite", header: "Priorité", cell: ({ row }) => priorityCell(row, options.canManage) },
      { accessorKey: "statut", header: "Statut", cell: ({ row }) => statutCell(row, options.canManage) },
      { accessorKey: "avancement", header: "%", cell: ({ row }) => `${row.original.avancement}%` },
      { accessorKey: "projectNom", header: "Projet" },
    ];
    if (options.canManage || options.canDelete || options.canAddSubtask) cols.push(actionsColumn(options));
    return cols;
  }

  const cols: ColumnDef<TaskRow>[] = [
    { accessorKey: "titre", header: "Titre", cell: TITRE_CELL },
    { accessorKey: "projectNom", header: "Projet" },
    { accessorKey: "statut", header: "Statut", cell: ({ row }) => statutCell(row, options.canManage) },
    { accessorKey: "priorite", header: "Priorité", cell: ({ row }) => priorityCell(row, options.canManage) },
    { accessorKey: "responsableNom", header: "Responsable" },
    { accessorKey: "echeance", header: "Échéance", cell: ECHEANCE_CELL },
    { accessorKey: "avancement", header: "%", cell: ({ row }) => `${row.original.avancement}%` },
  ];

  if (options.canManage || options.canDelete) cols.push(actionsColumn(options));

  return cols;
}

export function TaskListView({
  tasks,
  users = [],
  canManage = false,
  canDelete = false,
  canAddSubtask,
  showCreneau = false,
  className,
  currentUserId,
}: {
  tasks: TaskRow[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
  // Demande utilisateur — par défaut égal à canManage (comportement
  // inchangé), à passer explicitement quand l'autorisation réelle de
  // subdiviser (TASK_CREATE scopé) diffère de TASK_UPDATE, ex. mes-tâches.
  canAddSubtask?: boolean;
  // Planning personnel (§4/§10) : remplace la colonne "Responsable" (toujours
  // l'utilisateur courant sur /planning-personnel/mes-taches, donc sans
  // intérêt) par la plage horaire réelle de la tâche.
  showCreneau?: boolean;
  className?: string;
  // Demande utilisateur : le responsable principal ne peut pas changer les
  // dates d'une tâche qui lui est assignée directement depuis ce dialogue
  // d'édition (voir TaskEditDialog isOwner) — approximation par
  // responsablePrincipalId uniquement (TaskRow n'a pas les co-assignés) ;
  // l'autorisation réelle et complète reste vérifiée côté serveur (updateTask).
  currentUserId?: string;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null);
  const { run: remove } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  const resolvedCanAddSubtask = canAddSubtask ?? canManage;

  const columns = useMemo(
    () =>
      buildColumns({
        canManage,
        canDelete,
        canAddSubtask: resolvedCanAddSubtask,
        showCreneau,
        onEdit: setEditingId,
        onAddSubtask: (task) => setSubtaskParentId(task.id),
        onDelete: (task) => remove(task.id),
      }),
    [canManage, canDelete, resolvedCanAddSubtask, showCreneau, remove]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const editingTask = tasks.find((t) => t.id === editingId) ?? null;
  const subtaskParentTask = tasks.find((t) => t.id === subtaskParentId) ?? null;

  return (
    <div className={cn("rounded-md border", className)}>
      {/* Table impose text-sm sur elle-meme (pas seulement herite) : un
          text-xs sur ce wrapper ne suffirait pas a le reduire — passe
          directement sur <Table>, uniquement pour la variante mes-taches
          (showCreneau), sans toucher /taches (l'autre appelant). */}
      <Table className={showCreneau ? "text-xs" : undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                Aucune tâche.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          users={users}
          isOwner={!!currentUserId && editingTask.responsablePrincipalId === currentUserId}
          open={!!editingId}
          onOpenChange={(o) => {
            setEditingId(o ? editingId : null);
            if (!o) router.refresh();
          }}
        />
      )}
      {subtaskParentTask && (
        <AddSubtaskDialog
          parentTaskId={subtaskParentTask.id}
          parentTitre={subtaskParentTask.titre}
          users={users}
          open={!!subtaskParentId}
          onOpenChange={(o) => {
            setSubtaskParentId(o ? subtaskParentId : null);
            if (!o) router.refresh();
          }}
        />
      )}
    </div>
  );
}
