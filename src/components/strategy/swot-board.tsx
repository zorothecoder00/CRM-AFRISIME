"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createSwotItem, deleteSwotItem } from "@/actions/swot.actions";
import { SWOT_CATEGORIES } from "@/lib/validations/swot.schema";
import type { SwotBoard as SwotBoardData } from "@/lib/strategy-copilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

const CATEGORY_META: Record<(typeof SWOT_CATEGORIES)[number], { label: string; accent: "success" | "destructive" | "info" | "warning" }> = {
  FORCE: { label: "Forces", accent: "success" },
  FAIBLESSE: { label: "Faiblesses", accent: "destructive" },
  OPPORTUNITE: { label: "Opportunités", accent: "info" },
  MENACE: { label: "Menaces", accent: "warning" },
};

function QuadrantForm({ categorie }: { categorie: (typeof SWOT_CATEGORIES)[number] }) {
  const [value, setValue] = useState("");
  const { run, isPending } = useAction(createSwotItem);

  async function handleAdd() {
    if (!value.trim()) return;
    const result = await run({ categorie, contenu: value.trim() });
    if (result.ok) setValue("");
  }

  return (
    <div className="flex gap-1.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Ajouter..."
        className="h-8 text-sm"
      />
      <Button size="icon-sm" onClick={handleAdd} disabled={isPending || !value.trim()}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SwotItemRow({ id, contenu }: { id: string; contenu: string }) {
  const { run, isPending } = useAction(deleteSwotItem);
  return (
    <li className="flex items-start justify-between gap-2 text-sm">
      <span>{contenu}</span>
      <button
        onClick={() => run(id)}
        disabled={isPending}
        aria-label="Supprimer"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

// Analyse SWOT (cahier des charges V3.0 §10 "Strategy Copilot"). Grille a 4
// quadrants, ajout/suppression en ligne — pas de dialogue, coherent avec la
// nature "brainstorming" de l'outil.
export function SwotBoard({ board, canManage }: { board: SwotBoardData; canManage: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SWOT_CATEGORIES.map((cat) => (
        <Card key={cat} accent={CATEGORY_META[cat].accent}>
          <CardHeader>
            <CardTitle className="text-sm">{CATEGORY_META[cat].label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5">
              {board[cat].map((item) => (
                canManage ? (
                  <SwotItemRow key={item.id} id={item.id} contenu={item.contenu} />
                ) : (
                  <li key={item.id} className="text-sm">
                    {item.contenu}
                  </li>
                )
              ))}
              {board[cat].length === 0 && <li className="text-xs text-muted-foreground">Aucun élément.</li>}
            </ul>
            {canManage && <QuadrantForm categorie={cat} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
