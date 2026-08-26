"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updateTaskStatus } from "@/actions/task.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForStatus } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const STATUSES = Object.keys(STATUS_LABELS);

/**
 * Donne la main à l'utilisateur pour changer le statut d'une tâche
 * directement (ex. la marquer Terminée), sans passer par le drag-and-drop
 * du kanban ni par le circuit de validation formel (ValidationActions,
 * distinct — validation avec approbateur).
 */
export function TaskStatusSelect({ taskId, statut }: { taskId: string; statut: string }) {
  const router = useRouter();
  const { run, isPending } = useAction(updateTaskStatus);

  async function handleChange(value: string) {
    if (value === statut) return;
    const result = await run(taskId, value);
    if (result.ok) router.refresh();
  }

  return (
    <Select value={statut} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(badgeVariants({ variant: toneForStatus(statut) }), "h-6 w-auto border-none px-2 py-0 [&_svg]:opacity-70")}
      >
        <SelectValue>{STATUS_LABELS[statut]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
