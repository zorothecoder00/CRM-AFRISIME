"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import type { PersonalPlanningEntryRow } from "@/components/personal-planning/personal-planning-week";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import type { ScheduleConflict } from "@/lib/personal-planning-conflicts";

export type ConflictingEntry = {
  entry: PersonalPlanningEntryRow;
  conflictWith: ScheduleConflict;
  /** Données complètes de l'autre activité en conflit, quand ce n'est pas une réunion (voir meetingHref). */
  otherEntry?: PersonalPlanningEntryRow;
};

/**
 * §42 — surface les conflits détectés avec des actions concrètes (cahier de
 * corrections UI/UX §14) : déplacer l'une OU l'autre des deux activités
 * en conflit (par leur nom, pas un bouton générique), ou conserver le
 * conflit (masque la carte localement, sans rien modifier en base — un
 * simple accusé de réception, pas une décision qui a besoin d'être retenue
 * après un rechargement).
 */
export function PersonalPlanningConflictsCard({
  conflicts,
  refData,
}: {
  conflicts: ConflictingEntry[];
  refData: PersonalPlanningReferenceData;
}) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" ? { ...editing, type: editing.type } : null;

  const visible = conflicts.filter((c) => !dismissedIds.has(c.entry.id));
  if (visible.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <TriangleAlert className="size-5 text-destructive" />
        <CardTitle className="text-base">⚠️ Conflits de planning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map(({ entry, conflictWith, otherEntry }) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm"
          >
            <div>
              <span className="font-medium">{entry.titre}</span>
              <p className="text-xs text-muted-foreground">Conflit avec : {conflictWith.titre}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditing(entry)}>
                Déplacer « {entry.titre} »
              </Button>
              {conflictWith.meetingHref && (
                <Link href={conflictWith.meetingHref}>
                  <Button size="sm" variant="outline">
                    Déplacer la réunion
                  </Button>
                </Link>
              )}
              {otherEntry && (
                <Button size="sm" variant="outline" onClick={() => setEditing(otherEntry)}>
                  Déplacer « {otherEntry.titre} »
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDismissedIds((prev) => new Set(prev).add(entry.id))}>
                Conserver le conflit
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      {editData && (
        <PersonalPlanningEntryEditDialog entry={editData} open={!!editing} onOpenChange={(o) => setEditing(o ? editing : null)} refData={refData} />
      )}
    </Card>
  );
}
