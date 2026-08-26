"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProjectClosureChecklist, updateProjectDateFinReelle } from "@/actions/project.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import type { ClosureCheckItem } from "@/lib/project-closure";

export function ProjectClosureSection({
  projectId,
  items,
  dateFinReelle,
  canManage,
}: {
  projectId: string;
  items: ClosureCheckItem[];
  dateFinReelle: string | null;
  canManage: boolean;
}) {
  const { run: setChecklist } = useAction(updateProjectClosureChecklist, { successMessage: "Checklist mise à jour." });
  const [dateValue, setDateValue] = useState(dateFinReelle ?? "");
  const { run: setDateFinReelle, isPending: savingDate } = useAction(updateProjectDateFinReelle, {
    successMessage: "Date de fin réelle enregistrée.",
  });

  const doneCount = items.filter((i) => i.applicable && i.done).length;
  const naCount = items.filter((i) => !i.applicable).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {doneCount}/{items.length} éléments validés
          {naCount > 0 && ` (${naCount} sans objet — rien à vérifier)`}.
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <Input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="h-8 w-auto" />
            <Button
              size="sm"
              variant="outline"
              disabled={savingDate || !dateValue}
              onClick={() => setDateFinReelle({ projectId, dateFinReelle: dateValue })}
            >
              Marquer la date de fin réelle
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.key} size="sm">
            <CardContent className="flex items-center justify-between px-(--card-spacing)">
              <div className="flex items-center gap-2">
                {item.auto ? (
                  !item.applicable ? (
                    <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <Checkbox
                    checked={item.done}
                    disabled={!canManage}
                    onCheckedChange={(v) => setChecklist({ projectId, [item.key]: v === true } as never)}
                  />
                )}
                <span className="text-sm">{item.label}</span>
              </div>
              {item.detail && (
                <Badge variant={item.applicable && item.done ? "success" : "outline"} className="text-xs">
                  {item.detail}
                </Badge>
              )}
              {item.auto && !item.detail && <Badge variant="outline">Auto</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
