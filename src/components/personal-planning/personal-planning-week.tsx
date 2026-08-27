"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { deletePersonalPlanningEntry } from "@/actions/personal-planning.actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PersonalPlanningEntryEditDialog, type PersonalPlanningEntryEditData } from "@/components/personal-planning/entry-edit-dialog";
import { cn } from "@/lib/utils";
import { NotebookPen, Ban, Lock, Sparkles } from "lucide-react";

export type PersonalPlanningEntryRow = {
  id: string;
  titre: string;
  notes: string | null;
  dateDebut: string;
  dateFin: string;
  type: "NOTE" | "INDISPONIBLE" | "RESERVE";
};

export type PersonalPlanningDay = {
  key: string;
  label: string;
  isToday: boolean;
  entries: PersonalPlanningEntryRow[];
};

const TYPE_STYLE: Record<PersonalPlanningEntryRow["type"], { icon: typeof NotebookPen; border: string; bg: string; text: string; label: string }> = {
  NOTE: { icon: NotebookPen, border: "border-l-primary", bg: "bg-primary/5", text: "text-primary", label: "Note" },
  INDISPONIBLE: { icon: Ban, border: "border-l-destructive", bg: "bg-destructive/5", text: "text-destructive", label: "Indisponible" },
  RESERVE: { icon: Lock, border: "border-l-warning", bg: "bg-warning/5", text: "text-warning", label: "Réservé" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function PersonalPlanningWeek({ days }: { days: PersonalPlanningDay[] }) {
  const [editing, setEditing] = useState<PersonalPlanningEntryRow | null>(null);
  const { run: remove } = useAction(deletePersonalPlanningEntry, { successMessage: "Entrée supprimée." });

  const editData: PersonalPlanningEntryEditData | null =
    editing && editing.type !== "RESERVE" ? { ...editing, type: editing.type } : null;

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {days.map((day) => (
        <Card key={day.key} size="sm" accent={day.isToday ? "primary" : "none"} className={cn(day.isToday && "ring-2 ring-primary/40")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-1 text-sm">
              <span className="capitalize">{day.label}</span>
              {day.entries.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {day.entries.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {day.entries.length === 0 && (
              <div className="flex flex-col items-center gap-1 py-3 text-center">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Rien de prévu</p>
              </div>
            )}
            {day.entries.map((entry) => {
              const style = TYPE_STYLE[entry.type];
              const Icon = style.icon;
              return (
                <div
                  key={entry.id}
                  className={cn("group flex items-start gap-1.5 rounded-md border-l-2 p-1.5 text-xs", style.border, style.bg)}
                >
                  <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", style.text)} />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {formatTime(entry.dateDebut)} {entry.titre}
                    </span>
                    <Badge variant="outline" className="mt-0.5 text-[10px]">
                      {style.label}
                    </Badge>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100">
                    <RowActionsMenu
                      onEdit={entry.type !== "RESERVE" ? () => setEditing(entry) : undefined}
                      onDelete={() => remove({ id: entry.id })}
                      deleteConfirmLabel={`Supprimer « ${entry.titre} » ?`}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {editData && (
        <PersonalPlanningEntryEditDialog entry={editData} open={!!editing} onOpenChange={(o) => setEditing(o ? editing : null)} />
      )}
    </div>
  );
}
