"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkProjectToProgramme } from "@/actions/programme.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

/** Rattache un projet existant a ce programme (le retire de son eventuel programme actuel). */
export function LinkProjectForm({ programmeId, projects }: { programmeId: string; projects: Option[] }) {
  const [projectId, setProjectId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkProjectToProgramme, {
    successMessage: "Projet rattaché au programme.",
  });

  async function handleLink() {
    if (!projectId) return;
    const result = await run({ projectId, programmeId });
    if (result.ok) setProjectId(undefined);
  }

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun autre projet disponible.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Sélectionner un projet" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleLink} disabled={!projectId || isPending} size="sm">
        Rattacher
      </Button>
    </div>
  );
}
