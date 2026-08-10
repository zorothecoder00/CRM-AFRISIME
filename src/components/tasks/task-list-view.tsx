"use client";

import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TaskRow = {
  id: string;
  titre: string;
  projectNom: string;
  statut: string;
  priorite: string;
  echeance: string | null;
  responsableNom: string;
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

const columns: ColumnDef<TaskRow>[] = [
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
    cell: ({ row }) => <Badge variant="secondary">{STATUS_LABELS[row.original.statut]}</Badge>,
  },
  {
    accessorKey: "priorite",
    header: "Priorité",
    cell: ({ row }) => <Badge variant="outline">{PRIORITY_LABELS[row.original.priorite]}</Badge>,
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

export function TaskListView({ tasks }: { tasks: TaskRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
    </div>
  );
}
