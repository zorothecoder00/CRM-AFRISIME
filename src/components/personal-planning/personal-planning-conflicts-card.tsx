"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";

export type ConflictingEntry = { entry: PersonalPlanningEntryRow; conflictWith: string };

/**
 * §42 — surface les conflits détectés avec une action concrète ("Déplacer
 * l'activité ?", pas seulement un toast transitoire au moment de la
 * création/déplacement) : ouvre le même dialogue d'édition que les autres
 * vues, pré-rempli sur l'activité en conflit.
 */
export function PersonalPlanningConflictsCard({
  conflicts,
  refData,
}: {
  conflicts: ConflictingEntry[];
  refData: PersonalPlanningReferenceData;
}) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);
  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" ? { ...editing, type: editing.type } : null;

  if (conflicts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <TriangleAlert className="size-5 text-destructive" />
        <CardTitle className="text-base">⚠️ Conflits de planning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {conflicts.map(({ entry, conflictWith }) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm"
          >
            <div>
              <span className="font-medium">{entry.titre}</span>
              <p className="text-xs text-muted-foreground">Conflit avec : {conflictWith}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(entry)}>
              Déplacer l&apos;activité ?
            </Button>
          </div>
        ))}
      </CardContent>
      {editData && (
        <PersonalPlanningEntryEditDialog entry={editData} open={!!editing} onOpenChange={(o) => setEditing(o ? editing : null)} refData={refData} />
      )}
    </Card>
  );
}
