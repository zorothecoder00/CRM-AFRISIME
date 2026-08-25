"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProjectLocation } from "@/actions/project.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProjectLocationForm({
  projectId,
  initialLocalisation,
  initialPays,
  initialLatitude,
  initialLongitude,
}: {
  projectId: string;
  initialLocalisation: string | null;
  initialPays: string | null;
  initialLatitude: number | null;
  initialLongitude: number | null;
}) {
  const [localisation, setLocalisation] = useState(initialLocalisation ?? "");
  const [pays, setPays] = useState(initialPays ?? "");
  const [latitude, setLatitude] = useState(initialLatitude !== null ? String(initialLatitude) : "");
  const [longitude, setLongitude] = useState(initialLongitude !== null ? String(initialLongitude) : "");
  const { run, isPending } = useAction(updateProjectLocation, { successMessage: "Localisation enregistrée." });

  async function handleSave() {
    await run({
      projectId,
      localisation: localisation.trim() || undefined,
      pays: pays.trim() || undefined,
      latitude: latitude.trim() || undefined,
      longitude: longitude.trim() || undefined,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Ville"
        value={localisation}
        onChange={(e) => setLocalisation(e.target.value)}
        className="h-8 w-40"
      />
      <Input placeholder="Pays" value={pays} onChange={(e) => setPays(e.target.value)} className="h-8 w-32" />
      <Input
        type="number"
        step="any"
        placeholder="Latitude"
        value={latitude}
        onChange={(e) => setLatitude(e.target.value)}
        className="h-8 w-28"
      />
      <Input
        type="number"
        step="any"
        placeholder="Longitude"
        value={longitude}
        onChange={(e) => setLongitude(e.target.value)}
        className="h-8 w-28"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        Enregistrer
      </Button>
    </div>
  );
}
