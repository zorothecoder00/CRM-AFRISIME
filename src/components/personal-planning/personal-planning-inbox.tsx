"use client";

import { useState } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForPriority } from "@/lib/status-tone";
import { useAction } from "@/hooks/use-action";
import { reassignInboxTask } from "@/actions/personal-planning.actions";
import { deleteTask } from "@/actions/trash.actions";
import { GripVertical, Inbox, UserRoundCog, Trash2 } from "lucide-react";

export type InboxTaskRow = {
  id: string;
  titre: string;
  priorite: string;
  projetNom: string;
};

const TASK_PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

function InboxTaskCard({ task, colleagues }: { task: InboxTaskRow; colleagues: { id: string; label: string }[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `inbox-task-${task.id}` });
  const [showReassign, setShowReassign] = useState(false);
  const { run: reassign, isPending: isReassigning } = useAction(reassignInboxTask, { successMessage: "Tâche réaffectée." });
  const { run: remove, isPending: isDeleting } = useAction(deleteTask, { successMessage: "Tâche supprimée." });

  async function handleDelete() {
    if (!window.confirm(`Supprimer « ${task.titre} » ? La tâche sera déplacée dans la corbeille.`)) return;
    await remove(task.id);
  }

  return (
    <div className={`rounded-md border p-2 text-xs ${isDragging ? "opacity-40" : ""}`}>
      <div ref={setNodeRef} {...listeners} {...attributes} className="flex cursor-grab touch-none items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0 flex-1">
          <Link href={`/taches/${task.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {task.titre}
          </Link>
          <div className="mt-0.5 flex items-center gap-1">
            <Badge variant={toneForPriority(task.priorite)} className="text-[10px]">
              {TASK_PRIORITY_LABELS[task.priorite] ?? task.priorite}
            </Badge>
            <span className="truncate text-[10px] text-muted-foreground">{task.projetNom}</span>
          </div>
        </div>
        {colleagues.length > 0 && (
          <button type="button" title="Affecter à un collègue" onClick={() => setShowReassign((v) => !v)} className="shrink-0 text-muted-foreground hover:text-primary">
            <UserRoundCog className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" title="Supprimer" disabled={isDeleting} onClick={handleDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {showReassign && (
        <div className="mt-2 flex items-center gap-1.5 pl-4.5">
          <Select
            disabled={isReassigning}
            onValueChange={async (newResponsableId) => {
              const result = await reassign({ taskId: task.id, newResponsableId });
              if (result.ok) setShowReassign(false);
            }}
          >
            <SelectTrigger className="h-7 text-xs">
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

/** §13/§29 : tâches sans date, glissables vers un créneau (§14) pour créer l'Activité qui les planifie, avec Affecter/Supprimer. */
export function PersonalPlanningInbox({ tasks, colleagues }: { tasks: InboxTaskRow[]; colleagues: { id: string; label: string }[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Inbox className="size-5 text-muted-foreground" />
        <CardTitle className="text-base">À planifier</CardTitle>
        {tasks.length > 0 && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            {tasks.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche en attente de planification.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Glissez une tâche sur un créneau pour la planifier.</p>
            {tasks.map((t) => (
              <InboxTaskCard key={t.id} task={t} colleagues={colleagues} />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
