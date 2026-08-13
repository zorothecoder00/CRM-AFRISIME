"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addPosteResponsabilite, deletePosteResponsabilite } from "@/actions/poste.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export type PosteResponsabiliteRow = { id: string; libelle: string };

export function PosteResponsabiliteList({
  posteId,
  items,
}: {
  posteId: string;
  items: PosteResponsabiliteRow[];
}) {
  const [libelle, setLibelle] = useState("");
  const { run: add, isPending: adding } = useAction(addPosteResponsabilite);
  const { run: remove } = useAction(deletePosteResponsabilite);

  async function handleAdd() {
    if (!libelle.trim()) return;
    const result = await add({ posteId, libelle: libelle.trim() });
    if (result.ok) setLibelle("");
  }

  return (
    <div className="space-y-1.5">
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">• {item.libelle}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Supprimer"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5">
        <Input
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Ajouter une responsabilité..."
          className="h-7 text-xs"
        />
        <Button size="icon-xs" variant="outline" onClick={handleAdd} disabled={adding || !libelle.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
