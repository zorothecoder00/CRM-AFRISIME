"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updateProjectStatus } from "@/actions/project.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForStatus } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUSES = Object.keys(STATUS_LABELS);

/**
 * Retour utilisateur — "comment changer le statut d'un projet ?" : jusqu'ici
 * uniquement possible par glisser-déposer dans la vue Kanban (peu
 * découvrable). Même principe que TaskStatusSelect : la fiche projet elle-même
 * permet de changer le statut directement, sans passer par le Kanban.
 */
export function ProjectStatusSelect({ projectId, statut }: { projectId: string; statut: string }) {
  const router = useRouter();
  const { run, isPending } = useAction(updateProjectStatus);

  async function handleChange(value: string) {
    if (value === statut) return;
    const result = await run(projectId, value);
    if (result.ok) {
      router.refresh();
      return;
    }
    // Demande utilisateur — un projet avec des taches encore ouvertes est
    // bloque par defaut (voir updateProjectStatus) ; propose de forcer la
    // cloture plutot que de s'arreter la, meme principe que les autres
    // confirmations de ce type dans l'app (window.confirm).
    const message = result.error instanceof Error ? result.error.message : "";
    if (message.includes("non terminée(s)") && window.confirm(`${message} Terminer quand même ?`)) {
      const forced = await run(projectId, value, true);
      if (forced.ok) router.refresh();
    }
  }

  const tone = toneForStatus(statut);

  return (
    <Select value={statut} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          badgeVariants({ variant: tone }),
          "h-5 w-auto gap-1 px-1.5 py-0 [&_svg]:size-3 [&_svg]:opacity-70",
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
