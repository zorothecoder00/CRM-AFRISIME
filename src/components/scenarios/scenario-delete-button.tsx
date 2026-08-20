"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { deleteScenario } from "@/actions/scenario.actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/** Suppression definitive (pas de corbeille pour Scenario, contrairement a Project/Task/Document). */
export function ScenarioDeleteButton({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { run, isPending } = useAction(deleteScenario, { successMessage: "Scénario supprimé." });

  async function handleClick() {
    if (!confirm("Supprimer définitivement ce scénario ? Cette action est irréversible.")) return;
    const result = await run(scenarioId);
    if (result.ok) router.push("/scenarios");
  }

  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="mr-1.5 h-4 w-4" />
      Supprimer
    </Button>
  );
}
