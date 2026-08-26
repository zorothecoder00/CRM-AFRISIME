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
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
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
  echeance: string | null;
  tempsEstimeHeures: number | null;
  avancement: number;
};

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

function buildColumns(options: {
  canManage: boolean;
  canDelete: boolean;
  onEdit: (id: string) => void;
  onDelete: (task: TaskRow) => void;
}): ColumnDef<TaskRow>[] {
  const cols: ColumnDef<TaskRow>[] = [
    {
      accessorKey: "titre",
      header: "Titre",
      cell: ({ row }) => (
        <Link href={`/taches/${row.original.id}`} className="font-medium hover:underline">
          {row.original.titre}
        </Link>
      ),
    },
    { accessorKey: "projectNom", header: "Projet" },
    {
      accessorKey: "statut",
      header: "Statut",
      cell: ({ row }) =>
        options.canManage ? (
          <TaskStatusSelect taskId={row.original.id} statut={row.original.statut} />
        ) : (
          <Badge variant={toneForStatus(row.original.statut)}>{STATUS_LABELS[row.original.statut]}</Badge>
        ),
    },
    {
      accessorKey: "priorite",
      header: "Priorité",
      cell: ({ row }) => (
        <Badge variant={toneForPriority(row.original.priorite)}>
          {PRIORITY_LABELS[row.original.priorite]}
        </Badge>
      ),
    },
    { accessorKey: "responsableNom", header: "Responsable" },
    {
      accessorKey: "echeance",
      header: "Échéance",
      cell: ({ row }) =>
        row.original.echeance
          ? new Date(row.original.echeance).toLocaleDateString("fr-FR")
          : "—",
    },
    { accessorKey: "avancement", header: "%", cell: ({ row }) => `${row.original.avancement}%` },
  ];

  if (options.canManage || options.canDelete) {
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActionsMenu
          onEdit={options.canManage ? () => options.onEdit(row.original.id) : undefined}
          onDelete={options.canDelete ? () => options.onDelete(row.original) : undefined}
          deleteConfirmLabel={`Supprimer « ${row.original.titre} » ? La tâche sera déplacée dans la corbeille.`}
        />
      ),
    });
  }

  return cols;
}

export function TaskListView({
  tasks,
  users = [],
  canManage = false,
  canDelete = false,
}: {
  tasks: TaskRow[];
  users?: Option[];
  canManage?: boolean;
  canDelete?: boolean;
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
        onEdit: setEditingId,
        onDelete: (task) => remove(task.id),
      }),
    [canManage, canDelete, remove]
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
    <div className="rounded-md border">
      <Table>
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
