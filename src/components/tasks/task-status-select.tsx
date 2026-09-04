"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updateTaskStatus } from "@/actions/task.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForTaskStatus } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
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

  const tone = toneForTaskStatus(statut);

  return (
    <Select value={statut} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          badgeVariants({ variant: tone }),
          "h-5 w-auto gap-1 px-1.5 py-0 [&_svg]:size-3 [&_svg]:opacity-70",
          // Le variant "outline" (À faire, tone quasi blanche sans bordure)
          // a besoin de garder sa bordure pour rester visible ; les autres
          // teintes sont pleines, la bordure par défaut du Select ferait
          // doublon.
          tone !== "outline" && "border-none"
        )}
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
