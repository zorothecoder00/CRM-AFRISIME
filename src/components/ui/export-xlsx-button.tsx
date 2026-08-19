"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportToXlsx, type XlsxColumn } from "@/lib/xlsx-export";
import { FileSpreadsheet } from "lucide-react";

/**
 * Bouton d'export générique (cahier des charges V2.2 §37) — exporte
 * exactement les lignes déjà chargées côté client (donc déjà filtrées/
 * triées par la vue courante), sans aller-retour serveur. Voir
 * src/lib/xlsx-export.ts.
 */
export function ExportXlsxButton<T extends Record<string, unknown>>({
  rows,
  columns,
  filename,
  sheetName,
  title,
  currency,
}: {
  rows: T[];
  columns: XlsxColumn<T>[];
  filename: string;
  sheetName?: string;
  title?: string;
  /** Devise pour les colonnes "currency" (défaut "XOF" côté xlsx-export.ts si absente). */
  currency?: string;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    try {
      await exportToXlsx(rows, columns, filename, { sheetName, title, currency });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending || rows.length === 0}>
      <FileSpreadsheet className="mr-1.5 h-4 w-4" />
      Exporter Excel
    </Button>
  );
}
