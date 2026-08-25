"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { createObjective, updateObjectiveSmart } from "@/actions/objective.actions";
import type { CreateObjectiveInput } from "@/lib/validations/objective.schema";
import { computeSmartScore, type SmartCriteria } from "@/lib/smart-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus } from "lucide-react";
import type { TreeNode } from "@/lib/tree";

export type ObjectiveNodeData = SmartCriteria & {
  id: string;
  titre: string;
  niveau: "GENERAL" | "SPECIFIQUE" | "RESULTAT";
  parentId: string | null;
  statut: string;
};

export type ConsistencyIssueData = { objectiveId: string; titre: string; niveau: string; message: string };

const NIVEAU_LABELS: Record<ObjectiveNodeData["niveau"], string> = {
  GENERAL: "Objectif général",
  SPECIFIQUE: "Objectif spécifique",
  RESULTAT: "Résultat",
};
const NEXT_NIVEAU: Record<ObjectiveNodeData["niveau"], ObjectiveNodeData["niveau"] | null> = {
  GENERAL: "SPECIFIQUE",
  SPECIFIQUE: "RESULTAT",
  RESULTAT: null,
};

/**
 * Objectives Builder + SMART (Project Studio §13-14) — Objectif général ->
 * spécifique -> Résultat via le champ Objective.niveau (parentId reutilise
 * la cascade existante). Livrables/Activités/Tâches restent geres par les
 * modules WBS (§15) et Livrables existants — un Résultat se lie a un
 * ProjectDeliverable via ProjectDeliverable.objectiveId (voir la section
 * Livrables de la fiche projet), pas duplique ici.
 */
export function ProjectObjectivesBuilder({
  projectId,
  tree,
  issues,
  canManage,
}: {
  projectId: string;
  tree: TreeNode<ObjectiveNodeData>[];
  issues: ConsistencyIssueData[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Objectif général → objectifs spécifiques → résultats, avec évaluation SMART pour chacun.
        </p>
        {canManage && <ObjectiveFormDialog projectId={projectId} niveau="GENERAL" />}
      </div>

      {issues.length > 0 && (
        <Card accent="warning">
          <CardContent className="space-y-1 px-(--card-spacing)">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Incohérences détectées
            </div>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {issues.map((issue, i) => (
                <li key={i}>
                  {issue.titre} — {issue.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun objectif général défini pour ce projet.</p>
      ) : (
        <div className="space-y-3">
          {tree.map((general) => (
            <ObjectiveNode key={general.id} node={general} projectId={projectId} canManage={canManage} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectiveNode({
  node,
  projectId,
  canManage,
  depth,
}: {
  node: TreeNode<ObjectiveNodeData>;
  projectId: string;
  canManage: boolean;
  depth: number;
}) {
  const { score } = computeSmartScore(node);
  const nextNiveau = NEXT_NIVEAU[node.niveau];

  return (
    <div className="space-y-2" style={{ marginLeft: depth > 0 ? "1.25rem" : 0 }}>
      <Card size="sm">
        <CardContent className="space-y-2 px-(--card-spacing)">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{NIVEAU_LABELS[node.niveau]}</Badge>
              <Link href={`/objectifs/${node.id}`} className="font-medium hover:underline">
                {node.titre}
              </Link>
            </div>
            <Badge variant={score >= 80 ? "success" : score >= 40 ? "warning" : "destructive"}>SMART : {score}%</Badge>
          </div>
          {canManage && <SmartChecklist objective={node} />}
        </CardContent>
      </Card>
      {node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child) => (
            <ObjectiveNode key={child.id} node={child} projectId={projectId} canManage={canManage} depth={depth + 1} />
          ))}
        </div>
      )}
      {canManage && nextNiveau && (
        <div style={{ marginLeft: "1.25rem" }}>
          <ObjectiveFormDialog
            projectId={projectId}
            niveau={nextNiveau}
            parentId={node.id}
            triggerLabel={`Ajouter ${NIVEAU_LABELS[nextNiveau].toLowerCase()}`}
          />
        </div>
      )}
    </div>
  );
}

function SmartChecklist({ objective }: { objective: ObjectiveNodeData }) {
  const [criteria, setCriteria] = useState<SmartCriteria>({
    smartSpecifique: objective.smartSpecifique,
    smartMesurable: objective.smartMesurable,
    smartAtteignable: objective.smartAtteignable,
    smartPertinent: objective.smartPertinent,
    smartTemporel: objective.smartTemporel,
  });
  const { run: save, isPending } = useAction(updateObjectiveSmart, { successMessage: "Évaluation SMART enregistrée." });

  async function toggle(key: keyof SmartCriteria) {
    const next = { ...criteria, [key]: !criteria[key] };
    setCriteria(next);
    await save({
      objectiveId: objective.id,
      smartSpecifique: !!next.smartSpecifique,
      smartMesurable: !!next.smartMesurable,
      smartAtteignable: !!next.smartAtteignable,
      smartPertinent: !!next.smartPertinent,
      smartTemporel: !!next.smartTemporel,
    });
  }

  const items: { key: keyof SmartCriteria; label: string }[] = [
    { key: "smartSpecifique", label: "Spécifique" },
    { key: "smartMesurable", label: "Mesurable" },
    { key: "smartAtteignable", label: "Atteignable" },
    { key: "smartPertinent", label: "Pertinent" },
    { key: "smartTemporel", label: "Temporellement défini" },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1.5">
          <Checkbox checked={!!criteria[key]} disabled={isPending} onCheckedChange={() => toggle(key)} />
          {label}
        </label>
      ))}
    </div>
  );
}

function ObjectiveFormDialog({
  projectId,
  niveau,
  parentId,
  triggerLabel,
}: {
  projectId: string;
  niveau: ObjectiveNodeData["niveau"];
  parentId?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [periode, setPeriode] = useState<CreateObjectiveInput["periode"]>("TRIMESTRIEL");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const { run: create, isPending } = useAction(createObjective, { successMessage: "Objectif créé." });

  async function handleCreate() {
    const result = await create({
      titre,
      periode,
      scope: "EQUIPE",
      projectId,
      dateDebut,
      dateFin,
      parentId,
      niveau,
    });
    if (result.ok) {
      setTitre("");
      setDateDebut("");
      setDateFin("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          {triggerLabel ?? `Ajouter ${NIVEAU_LABELS[niveau].toLowerCase()}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{NIVEAU_LABELS[niveau]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Période</Label>
            <Select value={periode} onValueChange={(v) => setPeriode(v as CreateObjectiveInput["periode"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANNUEL">Annuel</SelectItem>
                <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                <SelectItem value="MENSUEL">Mensuel</SelectItem>
                <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={isPending || !titre.trim() || !dateDebut || !dateFin}
            onClick={handleCreate}
          >
            {isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
