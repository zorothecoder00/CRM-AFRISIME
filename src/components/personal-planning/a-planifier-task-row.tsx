"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dotClassForPriority, toneForPriority } from "@/lib/status-tone";
import { useAction } from "@/hooks/use-action";
import { reassignInboxTask } from "@/actions/personal-planning.actions";
import { deleteTask } from "@/actions/trash.actions";
import { ScheduleTaskDialog } from "@/components/personal-planning/schedule-task-dialog";
import { UserRoundCog, Trash2, ExternalLink } from "lucide-react";

const TASK_PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

export type APlanifierTask = {
  id: string;
  titre: string;
  priorite: string;
  projetNom: string;
  echeance: string | null;
};

/**
 * Ligne de tâche sur /planning-personnel/a-planifier — même logique
 * d'affectation/suppression que l'aperçu du hub (personal-planning-inbox),
 * sans le glisser-déposer (pas de grille horaire sur cette page) et avec en
 * plus "Lier à une activité" pour planifier sans passer par le calendrier.
 */
export function APlanifierTaskRow({ task, colleagues }: { task: APlanifierTask; colleagues: { id: string; label: string }[] }) {
  const [showReassign, setShowReassign] = useState(false);
  const { run: reassign, isPending: isReassigning } = useAction(reassignInboxTask, { successMessage: "Tâche réaffectée." });
  const { run: remove, isPending: isDeleting } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  async function handleDelete() {
    if (!window.confirm(`Supprimer « ${task.titre} » ? La tâche sera déplacée dans la corbeille.`)) return;
    await remove(task.id);
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClassForPriority(task.priorite)}`}
              title={TASK_PRIORITY_LABELS[task.priorite] ?? task.priorite}
            />
            <Link href={`/taches/${task.id}?from=planning-personnel`} className="flex items-center gap-1 font-medium hover:underline">
              {task.titre}
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{task.projetNom}</span>
            {task.echeance && (
              <span className="text-xs text-muted-foreground">
                · Échéance {new Date(task.echeance).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
          <Badge variant={toneForPriority(task.priorite)} className="mt-1.5 text-[10px]">
            {TASK_PRIORITY_LABELS[task.priorite] ?? task.priorite}
          </Badge>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <ScheduleTaskDialog taskId={task.id} titre={task.titre} />
          {colleagues.length > 0 && (
            <Button size="sm" variant="ghost" title="Affecter à un collègue" onClick={() => setShowReassign((v) => !v)}>
              <UserRoundCog className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" title="Supprimer" disabled={isDeleting} onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      {showReassign && (
        <div className="flex items-center gap-1.5">
          <Select
            disabled={isReassigning}
            onValueChange={async (newResponsableId) => {
              const result = await reassign({ taskId: task.id, newResponsableId });
              if (result.ok) setShowReassign(false);
            }}
          >
            <SelectTrigger className="h-8 w-56 text-xs">
              <SelectValue placeholder="Affecter à..." />
            </SelectTrigger>
            <SelectContent>
              {colleagues.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
