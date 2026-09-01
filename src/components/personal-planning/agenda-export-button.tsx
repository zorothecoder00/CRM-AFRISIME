"use client";

import { Button } from "@/components/ui/button";
import { exportToXlsx } from "@/lib/xlsx-export";
import { ENTRY_TYPE_META, ENTRY_STATUT_LABELS, type PersonalPlanningEntryType, type PersonalPlanningEntryStatut } from "@/lib/personal-planning-types";
import { Download } from "lucide-react";

export type AgendaExportRow = {
  titre: string;
  dateDebut: string;
  dateFin: string;
  type: PersonalPlanningEntryType;
  statut: PersonalPlanningEntryStatut;
  lieu: string | null;
};

/** "Agenda consolidé" (prototype V2) — export .xlsx de l'ensemble des activités personnelles affichées, même utilitaire que le reste de l'appli (voir xlsx-export.ts). */
export function AgendaExportButton({ rows }: { rows: AgendaExportRow[] }) {
  function handleExport() {
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

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="mr-1 h-4 w-4" />
      Exporter
    </Button>
  );
}
