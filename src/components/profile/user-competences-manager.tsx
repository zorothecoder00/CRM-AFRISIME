"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { assignCompetence, removeCompetence } from "@/actions/competence.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Option = { id: string; label: string };

export type UserCompetenceData = { competenceId: string; nom: string; niveau: string };

const NIVEAU_LABELS: Record<string, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  EXPERT: "Expert",
};

export function UserCompetencesManager({
  competences,
  catalogue,
}: {
  competences: UserCompetenceData[];
  catalogue: Option[];
}) {
  const [competenceId, setCompetenceId] = useState("");
  const [niveau, setNiveau] = useState<"DEBUTANT" | "INTERMEDIAIRE" | "AVANCE" | "EXPERT">("DEBUTANT");
  const { run: assign, isPending } = useAction(assignCompetence, { successMessage: "Compétence ajoutée." });
  const { run: remove } = useAction(removeCompetence);

  const remaining = catalogue.filter((c) => !competences.some((uc) => uc.competenceId === c.id));

  async function handleAdd() {
    if (!competenceId) return;
    const result = await assign({ competenceId, niveau });
    if (result.ok) {
      setCompetenceId("");
      setNiveau("DEBUTANT");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {competences.length === 0 && <span className="text-sm text-muted-foreground">Aucune compétence déclarée.</span>}
        {competences.map((c) => (
          <Badge key={c.competenceId} variant="secondary" className="gap-1">
            {c.nom} — {NIVEAU_LABELS[c.niveau]}
            <button type="button" onClick={() => remove(c.competenceId)} aria-label={`Retirer ${c.nom}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {remaining.length > 0 && (
        <div className="flex gap-2">
          <Select value={competenceId} onValueChange={setCompetenceId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Ajouter une compétence..." />
            </SelectTrigger>
            <SelectContent>
              {remaining.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={niveau} onValueChange={(v) => setNiveau(v as typeof niveau)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NIVEAU_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAdd} disabled={isPending || !competenceId}>
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
}
