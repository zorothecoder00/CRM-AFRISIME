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
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
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

function formatCreneau(creneau: { debut: string; fin: string }): string {
  const debut = new Date(creneau.debut);
  const fin = new Date(creneau.fin);
  const isToday = debut.toDateString() === new Date().toDateString();
  const dateLabel = isToday ? "" : `${debut.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} `;
  const heureDebut = debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const heureFin = fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel}${heureDebut}–${heureFin}`;
}

function formatHeureDebut(creneau: { debut: string; fin: string }): string {
  return new Date(creneau.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
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

function priorityCell(row: { original: TaskRow }) {
  return (
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
  onEdit: (id: string) => void;
  onDelete: (task: TaskRow) => void;
}): ColumnDef<TaskRow> {
  return {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <RowActionsMenu
        onEdit={options.canManage ? () => options.onEdit(row.original.id) : undefined}
        onDelete={options.canDelete ? () => options.onDelete(row.original) : undefined}
        deleteConfirmLabel={`Supprimer « ${row.original.titre} » ? La tâche sera déplacée dans la corbeille.`}
      />
    ),
  };
}

function buildColumns(options: {
  canManage: boolean;
  canDelete: boolean;
  showCreneau: boolean;
  onEdit: (id: string) => void;
  onDelete: (task: TaskRow) => void;
}): ColumnDef<TaskRow>[] {
  // Planning personnel (§4/§10, showCreneau) : disposition dédiée demandée
  // par l'utilisateur — Heure/Tâche/Échéance/Priorité/Statut/Créneau/% —
  // distincte de la disposition générale de /taches ci-dessous. Pas de
  // colonne Projet ici (page déjà scopée à mes tâches), Heure = début du
  // créneau, extrait à part de la plage complète déjà donnée par "Créneau".
  if (options.showCreneau) {
    const cols: ColumnDef<TaskRow>[] = [
      {
        accessorKey: "creneau",
        id: "heure",
        header: "Heure",
        cell: ({ row }) => (
          <span className={row.original.creneau ? undefined : "text-muted-foreground"}>
            {row.original.creneau ? formatHeureDebut(row.original.creneau) : "—"}
          </span>
        ),
      },
      { accessorKey: "titre", header: "Tâche", cell: TITRE_CELL },
      { accessorKey: "echeance", header: "Échéance", cell: ECHEANCE_CELL },
      { accessorKey: "priorite", header: "Priorité", cell: ({ row }) => priorityCell(row) },
      { accessorKey: "statut", header: "Statut", cell: ({ row }) => statutCell(row, options.canManage) },
      {
        accessorKey: "creneau",
        id: "creneau",
        header: "Créneau",
        cell: ({ row }) => (
          <span className={row.original.creneau ? undefined : "text-muted-foreground"}>
            {row.original.creneau ? formatCreneau(row.original.creneau) : "Non planifiée"}
          </span>
        ),
      },
      { accessorKey: "avancement", header: "%", cell: ({ row }) => `${row.original.avancement}%` },
    ];
    if (options.canManage || options.canDelete) cols.push(actionsColumn(options));
    return cols;
  }

  const cols: ColumnDef<TaskRow>[] = [
    { accessorKey: "titre", header: "Titre", cell: TITRE_CELL },
    { accessorKey: "projectNom", header: "Projet" },
    { accessorKey: "statut", header: "Statut", cell: ({ row }) => statutCell(row, options.canManage) },
    { accessorKey: "priorite", header: "Priorité", cell: ({ row }) => priorityCell(row) },
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
  showCreneau = false,
  className,
}: {
  tasks: TaskRow[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
  // Planning personnel (§4/§10) : remplace la colonne "Responsable" (toujours
  // l'utilisateur courant sur /planning-personnel/mes-taches, donc sans
  // intérêt) par la plage horaire réelle de la tâche.
  showCreneau?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { run: remove } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  const columns = useMemo(
    () =>
      buildColumns({
        canManage,
        canDelete,
        showCreneau,
        onEdit: setEditingId,
        onDelete: (task) => remove(task.id),
      }),
    [canManage, canDelete, showCreneau, remove]
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
          open={!!editingId}
          onOpenChange={(o) => {
            setEditingId(o ? editingId : null);
            if (!o) router.refresh();
          }}
        />
      )}
    </div>
  );
}
