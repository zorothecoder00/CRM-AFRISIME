"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { setEntityTags } from "@/actions/tag.actions";
import type { TAGGABLE_ENTITY_TYPES } from "@/lib/validations/tag.schema";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Tag as TagIcon } from "lucide-react";

type EntityType = (typeof TAGGABLE_ENTITY_TYPES)[number];
type TagRef = { id: string; nom: string; couleur: string | null };

// Editeur de tags generique (V2.2 §28) — reutilise sur toute page de detail
// listee dans TAGGABLE_ENTITY_TYPES. Pas de combobox/autocomplete (aurait
// besoin de charger tous les tags existants) : simple saisie + Entree, la
// creation de tag se fait a la volee cote serveur (upsert par nom).
export function EntityTagsEditor({
  entityType,
  entityId,
  initialTags,
  canManage,
}: {
  entityType: EntityType;
  entityId: string;
  initialTags: TagRef[];
  canManage: boolean;
}) {
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");
  const { run, isPending } = useAction(setEntityTags);

  async function persist(nextNames: string[]) {
    const result = await run({ entityType, entityId, tagNames: nextNames });
    if (result.ok) setTags(result.data.tags);
  }

  async function addTag() {
    const value = input.trim();
    if (!value) return;
    setInput("");
    const names = Array.from(new Set([...tags.map((t) => t.nom), value]));
    await persist(names);
  }

  async function removeTag(nom: string) {
    await persist(tags.map((t) => t.nom).filter((n) => n !== nom));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TagIcon className="size-3.5 text-muted-foreground" />
      {tags.map((tag) => (
        <Badge key={tag.id} variant="outline">
          {tag.nom}
          {canManage && (
            <button
              type="button"
              aria-label={`Retirer le tag ${tag.nom}`}
              onClick={() => removeTag(tag.nom)}
              disabled={isPending}
              className="ml-1"
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      {tags.length === 0 && !canManage && <span className="text-xs text-muted-foreground">Aucun tag.</span>}
      {canManage && (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={() => input.trim() && addTag()}
          placeholder="Ajouter un tag…"
          disabled={isPending}
          className="h-6 w-32 text-xs"
        />
      )}
    </div>
  );
}
