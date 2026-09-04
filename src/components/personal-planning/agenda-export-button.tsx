"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToXlsx } from "@/lib/xlsx-export";
import { ENTRY_TYPE_META, ENTRY_STATUT_LABELS, type PersonalPlanningEntryType, type PersonalPlanningEntryStatut } from "@/lib/personal-planning-types";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";

export type AgendaExportRow = {
  titre: string;
  dateDebut: string;
  dateFin: string;
  type: PersonalPlanningEntryType;
  statut: PersonalPlanningEntryStatut;
  lieu: string | null;
};

/**
 * "Agenda consolidé" (prototype V2) — export xlsx (client, voir
 * xlsx-export.ts), PDF et Word (demande utilisateur — générés côté serveur
 * via /api/planning-personnel/agenda-export, mêmes renderers que les
 * rapports organisationnels, voir report-renderers.ts).
 */
export function AgendaExportButton({ rows }: { rows: AgendaExportRow[] }) {
  function handleExportXlsx() {
    exportToXlsx(
      rows,
      [
        { label: "Date", key: "dateDebut", type: "date", format: (v) => new Date(v as string) },
        { label: "Heure début", key: "dateDebut", type: "datetime", format: (v) => new Date(v as string) },
        { label: "Heure fin", key: "dateFin", type: "datetime", format: (v) => new Date(v as string) },
        { label: "Titre", key: "titre" },
        { label: "Type", key: "type", format: (v) => ENTRY_TYPE_META[v as PersonalPlanningEntryType].label },
        { label: "Statut", key: "statut", format: (v) => ENTRY_STATUT_LABELS[v as PersonalPlanningEntryStatut] },
        { label: "Lieu", key: "lieu" },
      ],
      `agenda-${new Date().toISOString().slice(0, 10)}.xlsx`,
      { sheetName: "Agenda", title: "Agenda consolidé" }
    );
  }

  function handleExportServer(format: "pdf" | "word") {
    window.location.href = `/api/planning-personnel/agenda-export?format=${format}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={rows.length === 0}>
          <Download className="mr-1 h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleExportXlsx}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExportServer("pdf")}>
          <FileText className="h-3.5 w-3.5" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExportServer("word")}>
          <File className="h-3.5 w-3.5" />
          Word (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
