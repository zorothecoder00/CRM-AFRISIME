"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { simulateOrgDesignDraft, deployOrgDesignDraft, deleteOrgDesignDraft } from "@/actions/org-design.actions";
import { Button } from "@/components/ui/button";
import { FlaskConical, Rocket, Pencil, Trash2 } from "lucide-react";

export function OrgDesignActions({ draftId, statut }: { draftId: string; statut: string }) {
  const router = useRouter();
  const simulateAction = useAction(simulateOrgDesignDraft, { successMessage: "Simulation calculée." });
  const deployAction = useAction(deployOrgDesignDraft, { successMessage: "Organisation déployée réellement." });
  const deleteAction = useAction(deleteOrgDesignDraft, { successMessage: "Brouillon supprimé." });
  const isPending = simulateAction.isPending || deployAction.isPending || deleteAction.isPending;

  async function handleDeploy() {
    if (!window.confirm("Déployer ce brouillon va créer réellement les départements, équipes, projets et processus décrits. Continuer ?")) return;
    const result = await deployAction.run({ id: draftId });
    if (result.ok) router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    const result = await deleteAction.run({ id: draftId });
    if (result.ok) router.push("/organisation-virtuelle");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statut !== "DEPLOYE" && (
        <Button variant="outline" onClick={() => simulateAction.run({ id: draftId }).then(() => router.refresh())} disabled={isPending}>
          <FlaskConical className="mr-1.5 h-4 w-4" /> Simuler
        </Button>
      )}
      {statut === "SIMULE" && (
        <Button onClick={handleDeploy} disabled={isPending}>
          <Rocket className="mr-1.5 h-4 w-4" /> Déployer réellement
        </Button>
      )}
      {statut !== "DEPLOYE" && (
        <>
          <Button variant="outline" onClick={() => router.push(`/organisation-virtuelle/${draftId}/modifier`)} disabled={isPending}>
            <Pencil className="mr-1.5 h-4 w-4" /> Modifier
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Supprimer
          </Button>
        </>
      )}
    </div>
  );
}
