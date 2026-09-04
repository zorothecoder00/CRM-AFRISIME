"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updateTaskPriority } from "@/actions/task.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForPriority } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

const PRIORITIES = Object.keys(PRIORITY_LABELS);

/**
 * Meme principe que TaskStatusSelect : donne la main a l'utilisateur pour
 * changer la priorite d'une tache directement depuis le tableau, sans
 * passer par la fiche complete.
 */
export function TaskPrioritySelect({ taskId, priorite }: { taskId: string; priorite: string }) {
  const router = useRouter();
  const { run, isPending } = useAction(updateTaskPriority);

  async function handleChange(value: string) {
    if (value === priorite) return;
    const result = await run(taskId, value);
    if (result.ok) router.refresh();
  }

  const tone = toneForPriority(priorite);

  return (
    <Select value={priorite} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          badgeVariants({ variant: tone }),
          "h-5 w-auto gap-1 px-1.5 py-0 [&_svg]:size-3 [&_svg]:opacity-70",
          tone !== "outline" && "border-none"
        )}
      >
        <SelectValue>{PRIORITY_LABELS[priorite]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
