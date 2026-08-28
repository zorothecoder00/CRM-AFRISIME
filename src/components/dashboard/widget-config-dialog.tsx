"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { updateDashboardPreferences } from "@/actions/dashboard.actions";
import { WIDGET_DEFS, widgetLabel, type WidgetKey } from "@/lib/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, GripVertical } from "lucide-react";

type Item = { key: WidgetKey; enabled: boolean };

function SortableRow({ item, onToggle }: { item: Item; onToggle: (key: WidgetKey, checked: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border p-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox checked={item.enabled} onCheckedChange={(c) => onToggle(item.key, c === true)} />
      <span className="text-sm">{widgetLabel(item.key)}</span>
    </div>
  );
}

export function WidgetConfigDialog({ initialOrder }: { initialOrder: WidgetKey[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(() => {
    const enabledSet = new Set(initialOrder);
    const ordered = initialOrder.map((key) => ({ key, enabled: true }));
    const rest = WIDGET_DEFS.filter((w) => !enabledSet.has(w.key)).map((w) => ({
      key: w.key,
      enabled: false,
    }));
    return [...ordered, ...rest];
  });
  const { run: submit, isPending } = useAction(updateDashboardPreferences, {
    successMessage: "Préférences enregistrées.",
  });
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.key === active.id);
      const newIndex = prev.findIndex((i) => i.key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleToggle(key: WidgetKey, checked: boolean) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, enabled: checked } : i)));
  }

  async function handleSave() {
    const widgets = items.filter((i) => i.enabled).map((i) => i.key);
    if (widgets.length === 0) {
      toast.error("Sélectionnez au moins un widget.");
      return;
    }
    const result = await submit({ widgets });
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1 h-4 w-4" />
          Configurer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurer les widgets</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cochez les widgets à afficher et glissez-les pour les réordonner.
        </p>
        <DndContext id="widget-config" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableRow key={item.key} item={item} onToggle={handleToggle} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button className="w-full" onClick={handleSave} disabled={isPending}>
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
