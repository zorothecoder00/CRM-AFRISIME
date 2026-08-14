"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addEtape, deleteEtape, reorderEtapes } from "@/actions/processus.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, X } from "lucide-react";

type Option = { id: string; label: string };

export type EtapeData = {
  id: string;
  nom: string;
  responsableName: string | null;
  delaiJours: number | null;
  entrees: string | null;
  sorties: string | null;
  regles: string | null;
};

function SortableEtape({ etape, canManage, onDelete }: { etape: EtapeData; canManage: boolean; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: etape.id,
  });

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
        <p className="font-medium">{etape.nom}</p>
        <p className="text-xs text-muted-foreground">
          {etape.responsableName ?? "Sans responsable"}
          {etape.delaiJours ? ` · ${etape.delaiJours} j` : ""}
        </p>
        {etape.entrees && <p className="text-xs text-muted-foreground">Entrées : {etape.entrees}</p>}
        {etape.sorties && <p className="text-xs text-muted-foreground">Sorties : {etape.sorties}</p>}
        {etape.regles && <p className="text-xs text-muted-foreground">Règles : {etape.regles}</p>}
      </div>
      {canManage && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(etape.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function EtapesDesigner({
  processusId,
  etapes,
  users,
  canManage,
}: {
  processusId: string;
  etapes: EtapeData[];
  users: Option[];
  canManage: boolean;
}) {
  const [items, setItems] = useState(etapes);
  const [nom, setNom] = useState("");
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [delaiJours, setDelaiJours] = useState("");
  const [entrees, setEntrees] = useState("");
  const [sorties, setSorties] = useState("");
  const [regles, setRegles] = useState("");
  const { run: add, isPending } = useAction(addEtape, { successMessage: "Étape ajoutée." });
  const { run: remove } = useAction(deleteEtape, { successMessage: "Étape supprimée." });
  const { run: reorder } = useAction(reorderEtapes);
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorder({ processusId, etapeIds: next.map((i) => i.id) });
      return next;
    });
  }

  async function handleAdd() {
    if (!nom.trim()) return;
    const result = await add({
      processusId,
      nom: nom.trim(),
      responsableId,
      delaiJours: delaiJours ? Number(delaiJours) : undefined,
      entrees: entrees.trim() || undefined,
      sorties: sorties.trim() || undefined,
      regles: regles.trim() || undefined,
    });
    if (result.ok) {
      setItems((prev) => [
        ...prev,
        {
          id: result.data.id,
          nom: result.data.nom,
          responsableName: users.find((u) => u.id === responsableId)?.label ?? null,
          delaiJours: result.data.delaiJours,
          entrees: result.data.entrees,
          sorties: result.data.sorties,
          regles: result.data.regles,
        },
      ]);
      setNom("");
      setResponsableId(undefined);
      setDelaiJours("");
      setEntrees("");
      setSorties("");
      setRegles("");
    }
  }

  async function handleDelete(id: string) {
    const result = await remove(id);
    if (result.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((etape) => (
              <SortableEtape key={etape.id} etape={etape} canManage={canManage} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Aucune étape définie.</p>}

      {canManage && (
        <div className="space-y-2 rounded-md border p-3">
          <Input placeholder="Nom de l'étape" value={nom} onChange={(e) => setNom(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={responsableId} onValueChange={setResponsableId}>
              <SelectTrigger>
                <SelectValue placeholder="Responsable (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              placeholder="Délai (jours, optionnel)"
              value={delaiJours}
              onChange={(e) => setDelaiJours(e.target.value)}
            />
          </div>
          <Textarea placeholder="Entrées (optionnel)" value={entrees} onChange={(e) => setEntrees(e.target.value)} rows={2} />
          <Textarea placeholder="Sorties (optionnel)" value={sorties} onChange={(e) => setSorties(e.target.value)} rows={2} />
          <Textarea placeholder="Règles (optionnel)" value={regles} onChange={(e) => setRegles(e.target.value)} rows={2} />
          <Button size="sm" onClick={handleAdd} disabled={isPending || !nom.trim()}>
            {isPending ? "Ajout..." : "Ajouter l'étape"}
          </Button>
        </div>
      )}
    </div>
  );
}
