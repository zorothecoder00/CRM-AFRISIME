"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAction } from "@/hooks/use-action";
import {
  generateSolutionTreeFromProblemTree,
  createSolutionTreeNode,
  updateSolutionTreeNode,
  deleteSolutionTreeNode,
  reorderSolutionTreeNodes,
} from "@/actions/solution-tree.actions";
import type { TreeNode } from "@/lib/tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GripVertical, Plus, Trash2, Pencil, Wand2 } from "lucide-react";

export type SolutionTreeNodeData = {
  id: string;
  parentId: string | null;
  type: "OBJECTIF_GLOBAL" | "SOLUTION" | "RESULTAT_ATTENDU";
  titre: string;
  description: string | null;
};

type Node = TreeNode<SolutionTreeNodeData>;

/**
 * Arbre des solutions (Project Studio §8) — généré depuis le Problem Tree
 * (PROBLEME_CENTRAL -> OBJECTIF_GLOBAL, CAUSE_* -> SOLUTION, CONSEQUENCE ->
 * RESULTAT_ATTENDU), puis affiné manuellement. Même mécanique de
 * glisser-déposer par fratrie que ProblemTreeView.
 */
export function SolutionTreeView({
  projectId,
  nodes,
  hasProblemTree,
  canManage,
}: {
  projectId: string;
  nodes: Node[];
  hasProblemTree: boolean;
  canManage: boolean;
}) {
  const root = nodes.find((n) => n.type === "OBJECTIF_GLOBAL");
  const { run: generate, isPending: isGenerating } = useAction(generateSolutionTreeFromProblemTree, {
    successMessage: "Arbre des solutions généré.",
  });

  if (!root) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {hasProblemTree
            ? "Aucun arbre des solutions pour ce projet."
            : "Définissez d'abord un arbre des problèmes pour pouvoir générer l'arbre des solutions."}
        </p>
        {canManage && hasProblemTree && (
          <Button size="sm" onClick={() => generate({ projectId })} disabled={isGenerating}>
            <Wand2 className="mr-1 h-4 w-4" />
            {isGenerating ? "Génération..." : "Générer depuis l'arbre des problèmes"}
          </Button>
        )}
      </div>
    );
  }

  const resultats = root.children.filter((n) => n.type === "RESULTAT_ATTENDU");
  const solutions = root.children.filter((n) => n.type === "SOLUTION");

  return (
    <div className="space-y-6">
      <Card accent="success">
        <CardContent className="space-y-1 px-(--card-spacing)">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Objectif global</div>
              <div className="font-medium">{root.titre}</div>
              {root.description && <p className="text-sm text-muted-foreground">{root.description}</p>}
            </div>
            {canManage && <EditNodeDialog node={root} />}
          </div>
        </CardContent>
      </Card>

      <NodeGroup
        projectId={projectId}
        parentId={root.id}
        type="RESULTAT_ATTENDU"
        label="Résultats attendus"
        initialNodes={resultats}
        canManage={canManage}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Solutions</h3>
          {canManage && (
            <NodeFormDialog projectId={projectId} parentId={root.id} type="SOLUTION" triggerLabel="Ajouter une solution" />
          )}
        </div>
        {solutions.length === 0 && <p className="text-sm text-muted-foreground">Aucune solution.</p>}
        <div className="space-y-3">
          {solutions.map((solution) => (
            <div key={solution.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{solution.titre}</div>
                  {solution.description && <p className="text-sm text-muted-foreground">{solution.description}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <EditNodeDialog node={solution} />
                    <DeleteButton nodeId={solution.id} />
                  </div>
                )}
              </div>
              {solution.children.length > 0 && (
                <div className="ml-4 border-l pl-4">
                  <NodeGroup
                    projectId={projectId}
                    parentId={solution.id}
                    type="SOLUTION"
                    label="Sous-solutions"
                    initialNodes={solution.children}
                    canManage={canManage}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ nodeId }: { nodeId: string }) {
  const { run: remove } = useAction(deleteSolutionTreeNode, { successMessage: "Noeud supprimé." });
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => remove({ nodeId })} aria-label="Supprimer">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function EditNodeDialog({ node }: { node: SolutionTreeNodeData }) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(node.titre);
  const [description, setDescription] = useState(node.description ?? "");
  const { run: update, isPending } = useAction(updateSolutionTreeNode, { successMessage: "Noeud mis à jour." });

  async function handleSave() {
    const result = await update({ nodeId: node.id, titre, description: description || undefined });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
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
  parentId,
  type,
  triggerLabel,
  onCreated,
}: {
  projectId: string;
  parentId?: string;
  type: SolutionTreeNodeData["type"];
  triggerLabel: string;
  onCreated?: (node: SolutionTreeNodeData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const { run: create, isPending } = useAction(createSolutionTreeNode, { successMessage: "Ajouté." });

  async function handleCreate() {
    const result = await create({ projectId, parentId, type, titre, description: description || undefined });
    if (result.ok) {
      setTitre("");
      setDescription("");
      setOpen(false);
      onCreated?.(result.data);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" disabled={isPending || !titre.trim()} onClick={handleCreate}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableNode({ node, canManage }: { node: SolutionTreeNodeData; canManage: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-2 rounded-md border p-2 text-sm ${isDragging ? "opacity-50" : ""}`}
    >
      {canManage && (
        <button type="button" {...attributes} {...listeners} className="mt-0.5 cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 space-y-1">
        <p className="font-medium">{node.titre}</p>
        {node.description && <p className="text-xs text-muted-foreground">{node.description}</p>}
      </div>
      {canManage && (
        <div className="flex items-center gap-1">
          <EditNodeDialog node={node} />
          <DeleteButton nodeId={node.id} />
        </div>
      )}
    </div>
  );
}

function NodeGroup({
  projectId,
  parentId,
  type,
  label,
  initialNodes,
  canManage,
  compact,
}: {
  projectId: string;
  parentId: string;
  type: SolutionTreeNodeData["type"];
  label: string;
  initialNodes: SolutionTreeNodeData[];
  canManage: boolean;
  compact?: boolean;
}) {
  const [items, setItems] = useState(initialNodes);
  const { run: reorder } = useAction(reorderSolutionTreeNodes);
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorder({ projectId, nodeIds: next.map((i) => i.id) });
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {compact ? <span className="text-xs text-muted-foreground">{label}</span> : <h3 className="text-sm font-medium">{label}</h3>}
        {canManage && (
          <NodeFormDialog
            projectId={projectId}
            parentId={parentId}
            type={type}
            triggerLabel={compact ? "Ajouter" : `Ajouter ${label.toLowerCase()}`}
            onCreated={(node) => setItems((prev) => [...prev, node])}
          />
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((node) => (
              <SortableNode key={node.id} node={node} canManage={canManage} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Aucun élément.</p>}
    </div>
  );
}
