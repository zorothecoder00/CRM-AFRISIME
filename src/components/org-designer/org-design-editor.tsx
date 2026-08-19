"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createOrgDesignDraft, updateOrgDesignDraft } from "@/actions/org-design.actions";
import type { OrgDesignNode } from "@/lib/org-designer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users2 } from "lucide-react";

let uid = 0;
function nextId() {
  uid += 1;
  return `n${Date.now()}${uid}`;
}

type DraftTeam = {
  id: string;
  nom: string;
  responsableId: string;
  competences: string;
  projets: string;
  processus: string;
};

type DraftNode = {
  id: string;
  nom: string;
  enfants: DraftNode[];
  equipes: DraftTeam[];
};

function emptyTeam(): DraftTeam {
  return { id: nextId(), nom: "", responsableId: "", competences: "", projets: "", processus: "" };
}

function emptyNode(nom = ""): DraftNode {
  return { id: nextId(), nom, enfants: [], equipes: [] };
}

function toOrgDesignNode(node: DraftNode): OrgDesignNode {
  return {
    nom: node.nom.trim(),
    enfants: node.enfants.map(toOrgDesignNode),
    equipes: node.equipes
      .filter((e) => e.nom.trim())
      .map((e) => ({
        nom: e.nom.trim(),
        responsableId: e.responsableId || undefined,
        competences: splitList(e.competences),
        projets: splitList(e.projets),
        processus: splitList(e.processus),
      })),
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function fromOrgDesignNode(node: OrgDesignNode): DraftNode {
  return {
    id: nextId(),
    nom: node.nom,
    enfants: node.enfants.map(fromOrgDesignNode),
    equipes: node.equipes.map((e) => ({
      id: nextId(),
      nom: e.nom,
      responsableId: e.responsableId ?? "",
      competences: e.competences.join(", "),
      projets: e.projets.join(", "),
      processus: e.processus.join(", "),
    })),
  };
}

function NodeEditor({
  node,
  onChange,
  onRemove,
  users,
  depth,
}: {
  node: DraftNode;
  onChange: (node: DraftNode) => void;
  onRemove?: () => void;
  users: { id: string; label: string }[];
  depth: number;
}) {
  function updateTeam(teamId: string, patch: Partial<DraftTeam>) {
    onChange({ ...node, equipes: node.equipes.map((e) => (e.id === teamId ? { ...e, ...patch } : e)) });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3" style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2">
        <Input
          placeholder={depth === 0 ? "Ex. Direction Afrique de l'Ouest" : "Ex. Togo"}
          value={node.nom}
          onChange={(e) => onChange({ ...node, nom: e.target.value })}
          className="max-w-sm"
        />
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {node.equipes.map((equipe) => (
        <div key={equipe.id} className="space-y-2 rounded-md bg-muted/40 p-2.5">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom de l'équipe"
              value={equipe.nom}
              onChange={(e) => updateTeam(equipe.id, { nom: e.target.value })}
              className="max-w-xs"
            />
            <Select
              value={equipe.responsableId || "none"}
              onValueChange={(v) => updateTeam(equipe.id, { responsableId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun responsable</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onChange({ ...node, equipes: node.equipes.filter((e) => e.id !== equipe.id) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Compétences (séparées par des virgules)"
              value={equipe.competences}
              onChange={(e) => updateTeam(equipe.id, { competences: e.target.value })}
            />
            <Input
              placeholder="Projets (séparés par des virgules)"
              value={equipe.projets}
              onChange={(e) => updateTeam(equipe.id, { projets: e.target.value })}
            />
            <Input
              placeholder="Processus (séparés par des virgules)"
              value={equipe.processus}
              onChange={(e) => updateTeam(equipe.id, { processus: e.target.value })}
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...node, equipes: [...node.equipes, emptyTeam()] })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Équipe
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...node, enfants: [...node.enfants, emptyNode()] })}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Sous-niveau
        </Button>
      </div>

      {node.enfants.map((enfant, index) => (
        <NodeEditor
          key={enfant.id}
          node={enfant}
          depth={depth + 1}
          users={users}
          onChange={(updated) =>
            onChange({ ...node, enfants: node.enfants.map((n, i) => (i === index ? updated : n)) })
          }
          onRemove={() => onChange({ ...node, enfants: node.enfants.filter((_, i) => i !== index) })}
        />
      ))}
    </div>
  );
}

export function OrgDesignEditor({
  users,
  draftId,
  initialNom = "",
  initialDescription = "",
  initialStructure,
}: {
  users: { id: string; label: string }[];
  draftId?: string;
  initialNom?: string;
  initialDescription?: string;
  initialStructure?: OrgDesignNode;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(initialNom);
  const [description, setDescription] = useState(initialDescription);
  const [root, setRoot] = useState<DraftNode>(() =>
    initialStructure ? fromOrgDesignNode(initialStructure) : emptyNode()
  );

  const createAction = useAction(createOrgDesignDraft, { successMessage: "Brouillon créé." });
  const updateAction = useAction(updateOrgDesignDraft, { successMessage: "Brouillon mis à jour." });
  const isPending = createAction.isPending || updateAction.isPending;

  async function handleSubmit() {
    if (!nom.trim() || !root.nom.trim()) return;
    const structure = toOrgDesignNode(root);

    if (draftId) {
      const result = await updateAction.run({ id: draftId, nom: nom.trim(), description: description.trim(), structure });
      if (result.ok) router.push(`/organisation-virtuelle/${draftId}`);
    } else {
      const result = await createAction.run({ nom: nom.trim(), description: description.trim(), structure });
      if (result.ok) router.push(`/organisation-virtuelle/${result.data.id}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom du brouillon</Label>
            <Input placeholder="Ex. Expansion Afrique de l'Ouest 2027" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure organisationnelle</CardTitle>
        </CardHeader>
        <CardContent>
          <NodeEditor node={root} onChange={setRoot} users={users} depth={0} />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={isPending || !nom.trim() || !root.nom.trim()}>
        {isPending ? "Enregistrement..." : draftId ? "Enregistrer les modifications" : "Créer le brouillon"}
      </Button>
    </div>
  );
}
