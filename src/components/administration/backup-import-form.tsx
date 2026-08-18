"use client";

import { useRef, useState } from "react";
import { useAction } from "@/hooks/use-action";
import { importBackup } from "@/actions/backup.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ImportResult } from "@/lib/backup";

const TABLE_LABELS: Record<string, string> = {
  project: "Projets",
  task: "Tâches",
  crmOrganization: "Organisations CRM",
  crmContact: "Contacts CRM",
  crmOpportunity: "Opportunités CRM",
  document: "Documents",
  objective: "Objectifs",
};

export function BackupImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { run, isPending } = useAction(importBackup);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Importer "${file.name}" ? Les lignes existantes (même id) seront mises à jour.`)) {
      e.target.value = "";
      return;
    }
    const text = await file.text();
    const res = await run(text);
    if (res.ok) setResult(res.data);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
        Importer une sauvegarde…
      </Button>
      {result && (
        <div className="space-y-1 rounded-md border p-3 text-sm">
          {result.map((r) => (
            <div key={r.table} className="flex items-center gap-2">
              <span className="w-40">{TABLE_LABELS[r.table] ?? r.table}</span>
              <Badge variant="success">{r.upserted} restaurée(s)</Badge>
              {r.failed > 0 && <Badge variant="destructive">{r.failed} échec(s)</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
