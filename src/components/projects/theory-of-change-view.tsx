"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import {
  createTheoryOfChangeNode,
  updateTheoryOfChangeNode,
  deleteTheoryOfChangeNode,
} from "@/actions/theory-of-change.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuickIndicatorDialog } from "@/components/projects/quick-indicator-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";

export type TheoryOfChangeNodeData = {
  id: string;
  niveau: "INPUT" | "ACTIVITE" | "OUTPUT" | "OUTCOME" | "IMPACT";
  titre: string;
  description: string | null;
  hypotheses: string | null;
  risques: string | null;
  conditions: string | null;
  indicateurs: string | null;
  sourcesVerification: string | null;
  indicatorCount: number;
};

const LEVELS: { key: TheoryOfChangeNodeData["niveau"]; label: string }[] = [
  { key: "INPUT", label: "Inputs" },
  { key: "ACTIVITE", label: "Activités" },
  { key: "OUTPUT", label: "Outputs" },
  { key: "OUTCOME", label: "Outcomes" },
  { key: "IMPACT", label: "Impact" },
];

/** Théorie du changement (Project Studio §11) — chaîne Inputs→Activités→Outputs→Outcomes→Impact, groupée par niveau. */
export function TheoryOfChangeView({
  projectId,
  nodes,
  canManage,
}: {
  projectId: string;
  nodes: TheoryOfChangeNodeData[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Inputs → Activités → Outputs → Outcomes → Impact, avec hypothèses, risques, conditions, indicateurs et
        sources de vérification pour chaque élément.
      </p>
      {LEVELS.map(({ key, label }) => {
        const levelNodes = nodes.filter((n) => n.niveau === key);
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{label}</h3>
              {canManage && <NodeFormDialog projectId={projectId} niveau={key} triggerLabel={`Ajouter (${label})`} />}
            </div>
            {levelNodes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun élément.</p>
            ) : (
              <div className="space-y-2">
                {levelNodes.map((node) => (
                  <Card key={node.id} size="sm">
                    <CardContent className="space-y-1 px-(--card-spacing)">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{node.titre}</span>
                            {node.indicatorCount > 0 && (
                              <Badge variant="info">
                                {node.indicatorCount} indicateur{node.indicatorCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {node.description && <p className="text-sm text-muted-foreground">{node.description}</p>}
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <QuickIndicatorDialog
                              projectId={projectId}
                              nom={node.titre}
                              definition={node.indicateurs}
                              theoryOfChangeNodeId={node.id}
                            />
                            <EditNodeDialog node={node} />
                            <DeleteButton nodeId={node.id} />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        {node.hypotheses && <p>Hypothèses : {node.hypotheses}</p>}
                        {node.risques && <p>Risques : {node.risques}</p>}
                        {node.conditions && <p>Conditions : {node.conditions}</p>}
                        {node.indicateurs && <p>Indicateurs : {node.indicateurs}</p>}
                        {node.sourcesVerification && <p>Sources de vérification : {node.sourcesVerification}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeleteButton({ nodeId }: { nodeId: string }) {
  const { run: remove } = useAction(deleteTheoryOfChangeNode, { successMessage: "Élément supprimé." });
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => remove({ nodeId })} aria-label="Supprimer">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

const FIELDS: { key: keyof Omit<TheoryOfChangeNodeData, "id" | "niveau" | "titre">; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypothèses" },
  { key: "risques", label: "Risques" },
  { key: "conditions", label: "Conditions" },
  { key: "indicateurs", label: "Indicateurs" },
  { key: "sourcesVerification", label: "Sources de vérification" },
];

function EditNodeDialog({ node }: { node: TheoryOfChangeNodeData }) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(node.titre);
  const [values, setValues] = useState<Record<string, string>>({
    description: node.description ?? "",
    hypotheses: node.hypotheses ?? "",
    risques: node.risques ?? "",
    conditions: node.conditions ?? "",
    indicateurs: node.indicateurs ?? "",
    sourcesVerification: node.sourcesVerification ?? "",
  });
  const { run: update, isPending } = useAction(updateTheoryOfChangeNode, { successMessage: "Élément mis à jour." });

  async function handleSave() {
    const result = await update({
      nodeId: node.id,
      titre,
      description: values.description || undefined,
      hypotheses: values.hypotheses || undefined,
      risques: values.risques || undefined,
      conditions: values.conditions || undefined,
      indicateurs: values.indicateurs || undefined,
      sourcesVerification: values.sourcesVerification || undefined,
    });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea value={values[key]} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
            </div>
          ))}
          <Button className="w-full" disabled={isPending || !titre.trim()} onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NodeFormDialog({
  projectId,
  niveau,
  triggerLabel,
}: {
  projectId: string;
  niveau: TheoryOfChangeNodeData["niveau"];
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
    description: "",
    hypotheses: "",
    risques: "",
    conditions: "",
    indicateurs: "",
    sourcesVerification: "",
  });
  const { run: create, isPending } = useAction(createTheoryOfChangeNode, { successMessage: "Ajouté." });

  async function handleCreate() {
    const result = await create({
      projectId,
      niveau,
      titre,
      description: values.description || undefined,
      hypotheses: values.hypotheses || undefined,
      risques: values.risques || undefined,
      conditions: values.conditions || undefined,
      indicateurs: values.indicateurs || undefined,
      sourcesVerification: values.sourcesVerification || undefined,
    });
    if (result.ok) {
      setTitre("");
      setValues({ description: "", hypotheses: "", risques: "", conditions: "", indicateurs: "", sourcesVerification: "" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea value={values[key]} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
            </div>
          ))}
          <Button className="w-full" disabled={isPending || !titre.trim()} onClick={handleCreate}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
