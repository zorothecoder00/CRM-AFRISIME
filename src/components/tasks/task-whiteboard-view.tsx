"use client";

import { useRef, useState } from "react";
import { useAction } from "@/hooks/use-action";
import { saveWhiteboard, type WhiteboardNote, type WhiteboardNoteKind } from "@/actions/whiteboard.actions";
import { Button } from "@/components/ui/button";
import { Save, X, StickyNote, Table, Workflow } from "lucide-react";

const COLORS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3"];

const KIND_LABELS: Record<WhiteboardNoteKind, string> = {
  NOTE: "Note",
  TABLEAU: "Tableau",
  PLAN: "Plan",
};

const KIND_ICONS: Record<WhiteboardNoteKind, typeof StickyNote> = {
  NOTE: StickyNote,
  TABLEAU: Table,
  PLAN: Workflow,
};

const KIND_WIDTH: Record<WhiteboardNoteKind, string> = {
  NOTE: "w-44",
  TABLEAU: "w-64",
  PLAN: "w-64",
};

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Tableau blanc collaboratif (cahier des charges §7) — v1 : canevas persisté par projet, sans sync temps réel. */
export function TaskWhiteboardView({
  projectId,
  initialNotes,
}: {
  projectId: string;
  initialNotes: WhiteboardNote[];
}) {
  const [notes, setNotes] = useState<WhiteboardNote[]>(initialNotes);
  const { run, isPending: isSaving } = useAction(saveWhiteboard, { successMessage: "Tableau blanc enregistré." });
  const boardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  function addNote(kind: WhiteboardNoteKind) {
    setNotes((prev) => [
      ...prev,
      { id: randomId(), x: 24, y: 24, text: "", color: COLORS[prev.length % COLORS.length], kind },
    ]);
  }

  function updateNote(id: string, patch: Partial<WhiteboardNote>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handlePointerDown(e: React.PointerEvent, note: WhiteboardNote) {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    dragState.current = {
      id: note.id,
      offsetX: e.clientX - boardRect.left - note.x,
      offsetY: e.clientY - boardRect.top - note.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!drag || !boardRect) return;
    updateNote(drag.id, {
      x: Math.max(0, e.clientX - boardRect.left - drag.offsetX),
      y: Math.max(0, e.clientY - boardRect.top - drag.offsetY),
    });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  async function handleSave() {
    await run(projectId, notes);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2">
        {(Object.keys(KIND_LABELS) as WhiteboardNoteKind[]).map((kind) => {
          const Icon = KIND_ICONS[kind];
          return (
            <Button key={kind} size="sm" variant="outline" onClick={() => addNote(kind)}>
              <Icon className="mr-1 h-4 w-4" />
              {KIND_LABELS[kind]}
            </Button>
          );
        })}
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-1 h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
      <div
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative h-[520px] overflow-hidden rounded-md border bg-muted/20"
      >
        {notes.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Cliquez sur « Note » pour ajouter une idée.
          </p>
        )}
        {notes.map((note) => {
          const kind = note.kind ?? "NOTE";
          return (
            <div
              key={note.id}
              className={`absolute ${KIND_WIDTH[kind]} rounded-md p-2 shadow-sm`}
              style={{ left: note.x, top: note.y, backgroundColor: note.color }}
            >
              <div
                className="mb-1 flex cursor-move items-center justify-between"
                onPointerDown={(e) => handlePointerDown(e, note)}
              >
                <span className="text-[10px] uppercase text-black/40">{KIND_LABELS[kind]}</span>
                <button type="button" onClick={() => removeNote(note.id)} aria-label="Supprimer">
                  <X className="h-3.5 w-3.5 text-black/40" />
                </button>
              </div>
              <textarea
                value={note.text}
                onChange={(e) => updateNote(note.id, { text: e.target.value })}
                className="w-full resize-none bg-transparent text-sm text-black focus:outline-none"
                rows={kind === "NOTE" ? 3 : 5}
                placeholder={kind === "TABLEAU" ? "Colonne | Colonne | Colonne\n..." : kind === "PLAN" ? "Étapes du plan..." : "..."}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
