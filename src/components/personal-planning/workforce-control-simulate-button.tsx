"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";

/**
 * "Simuler" (prototype V2, Workforce Control) — aperçu SANS PERSISTER : le
 * prototype lui-même ne fait qu'un toast côté client, rien de plus. Une
 * réaffectation réelle reste un choix humain explicite, tâche par tâche,
 * depuis /taches (jamais automatique).
 */
export function WorkforceControlSimulateButton({
  overloadedName,
  overloadedPercent,
  availableNames,
}: {
  overloadedName: string;
  overloadedPercent: number;
  availableNames: string[];
}) {
  function handleSimulate() {
    if (availableNames.length === 0) {
      toast.info(`Aucun collaborateur disponible identifié pour absorber la charge de ${overloadedName}.`);
      return;
    }
    toast.info(
      `Simulation : en répartissant une partie des tâches de ${overloadedName} (${overloadedPercent}%) vers ${availableNames.join(
        " et "
      )}, sa charge se rapprocherait de 100%. Aucune tâche n'a été déplacée — à faire manuellement depuis Mes tâches.`
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSimulate}>
      <PlayCircle className="mr-1 h-3.5 w-3.5" />
      Simuler
    </Button>
  );
}
