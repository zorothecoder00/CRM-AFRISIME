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
  createProblemTreeNode,
  updateProblemTreeNode,
  deleteProblemTreeNode,
  reorderProblemTreeNodes,
} from "@/actions/problem-tree.actions";
import type { TreeNode } from "@/lib/tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GripVertical, Plus, Trash2, Pencil } from "lucide-react";

export type ProblemTreeNodeData = {
  id: string;
  parentId: string | null;
  type: "CONSEQUENCE" | "PROBLEME_CENTRAL" | "CAUSE_DIRECTE" | "CAUSE_PROFONDE";
  titre: string;
  description: string | null;
  sources: string | null;
};

type Node = TreeNode<ProblemTreeNodeData>;

/**
 * Arbre à problèmes (Project Studio §7) — le problème central est la racine ;
 * conséquences et causes directes sont ses enfants (distingués par `type`),
 * les causes profondes sont enfants d'une cause directe. Réordonnancement par
 * glisser-déposer limité aux frères d'un même parent (comme EtapesDesigner) ;
 * la reparentation se fait en choisissant explicitement où ajouter un enfant,
 * pas en glissant entre branches.
 */
export function ProblemTreeView({
  projectId,
  nodes,
  canManage,
}: {
  projectId: string;
  nodes: Node[];
  canManage: boolean;
}) {
  const root = nodes.find((n) => n.type === "PROBLEME_CENTRAL");

  if (!root) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Aucun problème central défini pour ce projet.</p>
        {canManage && <NodeFormDialog projectId={projectId} type="PROBLEME_CENTRAL" triggerLabel="Définir le problème central" />}
      </div>
    );
  }

  const consequences = root.children.filter((n) => n.type === "CONSEQUENCE");
  const causesDirectes = root.children.filter((n) => n.type === "CAUSE_DIRECTE");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Conséquences et causes directes/profondes autour du problème central.
      </p>

      <Card accent="destructive">
        <CardContent className="space-y-1 px-(--card-spacing)">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Problème central</div>
              <div className="font-medium">{root.titre}</div>
              {root.description && <p className="text-sm text-muted-foreground">{root.description}</p>}
              {root.sources && <p className="text-xs text-muted-foreground">Sources : {root.sources}</p>}
            </div>
            {canManage && <EditNodeDialog node={root} />}
          </div>
        </CardContent>
      </Card>

      <NodeGroup
        projectId={projectId}
        parentId={root.id}
        type="CONSEQUENCE"
        label="Conséquences"
        initialNodes={consequences}
        canManage={canManage}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Causes directes</h3>
          {canManage && (
            <NodeFormDialog projectId={projectId} parentId={root.id} type="CAUSE_DIRECTE" triggerLabel="Ajouter une cause directe" />
          )}
        </div>
        {causesDirectes.length === 0 && <p className="text-sm text-muted-foreground">Aucune cause directe.</p>}
        <div className="space-y-3">
          {causesDirectes.map((cause) => (
            <div key={cause.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{cause.titre}</div>
                  {cause.description && <p className="text-sm text-muted-foreground">{cause.description}</p>}
                  {cause.sources && <p className="text-xs text-muted-foreground">Sources : {cause.sources}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <EditNodeDialog node={cause} />
                    <DeleteButton nodeId={cause.id} />
                  </div>
                )}
              </div>
              <div className="ml-4 border-l pl-4">
                <NodeGroup
                  projectId={projectId}
                  parentId={cause.id}
                  type="CAUSE_PROFONDE"
                  label="Causes profondes"
                  initialNodes={cause.children}
                  canManage={canManage}
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ nodeId }: { nodeId: string }) {
  const { run: remove } = useAction(deleteProblemTreeNode, { successMessage: "Noeud supprimé." });
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => remove({ nodeId })} aria-label="Supprimer">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function EditNodeDialog({ node }: { node: ProblemTreeNodeData }) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(node.titre);
  const [description, setDescription] = useState(node.description ?? "");
  const [sources, setSources] = useState(node.sources ?? "");
  const { run: update, isPending } = useAction(updateProblemTreeNode, { successMessage: "Noeud mis à jour." });

  async function handleSave() {
    const result = await update({ nodeId: node.id, titre, description: description || undefined, sources: sources || undefined });
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
          <div className="space-y-2">
            <Label>Sources / données / documents liés</Label>
            <Textarea value={sources} onChange={(e) => setSources(e.target.value)} />
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
  type: ProblemTreeNodeData["type"];
  triggerLabel: string;
  onCreated?: (node: ProblemTreeNodeData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [sources, setSources] = useState("");
  const { run: create, isPending } = useAction(createProblemTreeNode, { successMessage: "Ajouté." });

  async function handleCreate() {
    const result = await create({ projectId, parentId, type, titre, description: description || undefined, sources: sources || undefined });
    if (result.ok) {
      setTitre("");
      setDescription("");
      setSources("");
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
          <div className="space-y-2">
            <Label>Sources / données / documents liés</Label>
            <Textarea value={sources} onChange={(e) => setSources(e.target.value)} />
          </div>
          <Button className="w-full" disabled={isPending || !titre.trim()} onClick={handleCreate}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableNode({ node, canManage }: { node: ProblemTreeNodeData; canManage: boolean }) {
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
        {node.sources && <p className="text-xs text-muted-foreground">Sources : {node.sources}</p>}
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
  type: ProblemTreeNodeData["type"];
  label: string;
  initialNodes: ProblemTreeNodeData[];
  canManage: boolean;
  compact?: boolean;
}) {
  const [items, setItems] = useState(initialNodes);
  const { run: reorder } = useAction(reorderProblemTreeNodes);
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
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{label}</h3>
          {canManage && (
            <NodeFormDialog
              projectId={projectId}
              parentId={parentId}
              type={type}
              triggerLabel={`Ajouter${label ? " " + label.toLowerCase().replace(/s$/, "") : ""}`}
              onCreated={(node) => setItems((prev) => [...prev, node])}
            />
          )}
        </div>
      )}
      {compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {canManage && (
            <NodeFormDialog
              projectId={projectId}
              parentId={parentId}
              type={type}
              triggerLabel="Ajouter une cause profonde"
              onCreated={(node) => setItems((prev) => [...prev, node])}
            />
          )}
        </div>
      )}
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
