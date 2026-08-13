"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createProjectResource, deleteProjectResource } from "@/actions/project.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

export type ProjectResourceData = {
  id: string;
  nom: string;
  type: string | null;
  quantite: number | null;
  unite: string | null;
  coutUnitaire: number | null;
};

function ResourceRow({ resource }: { resource: ProjectResourceData }) {
  const { run, isPending } = useAction(deleteProjectResource);

  return (
    <div className="flex items-center justify-between rounded-md border p-2 text-sm">
      <div>
        <span className="font-medium">{resource.nom}</span>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {resource.type && <span>{resource.type}</span>}
          {resource.quantite !== null && (
            <span>
              {resource.quantite} {resource.unite ?? ""}
            </span>
          )}
          {resource.coutUnitaire !== null && <span>{resource.coutUnitaire} FCFA / unité</span>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => run({ resourceId: resource.id })}
        disabled={isPending}
        aria-label="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/** Ressources de projet (cahier des charges §VI) — registre distinct de l'équipe. */
export function ProjectResourcesSection({
  projectId,
  resources,
}: {
  projectId: string;
  resources: ProjectResourceData[];
}) {
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("");
  const { run: add, isPending } = useAction(createProjectResource, { successMessage: "Ressource ajoutée." });

  async function handleAdd() {
    if (!nom.trim()) return;
    const result = await add({ projectId, nom: nom.trim(), type: type || undefined, quantite: quantite || undefined, unite: unite || undefined });
    if (result.ok) {
      setNom("");
      setType("");
      setQuantite("");
      setUnite("");
    }
  }

  return (
    <div className="space-y-3">
      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune ressource enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <ResourceRow key={r.id} resource={r} />
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nom de la ressource" value={nom} onChange={(e) => setNom(e.target.value)} />
          <Input placeholder="Type (matériel, humain...)" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Quantité" type="number" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          <Input placeholder="Unité" value={unite} onChange={(e) => setUnite(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isPending || !nom.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
