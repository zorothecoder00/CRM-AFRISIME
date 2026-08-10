"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addDocumentVersion } from "@/actions/document.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddVersionForm({ documentId }: { documentId: string }) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) return;
    setIsSubmitting(true);
    try {
      await addDocumentVersion({ documentId, url: url.trim(), note: note.trim() || undefined });
      setUrl("");
      setNote("");
      toast.success("Nouvelle version enregistrée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Input
        placeholder="Nouveau lien / chemin du fichier"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Input
        placeholder="Note de version (optionnel)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Ajouter une nouvelle version"}
      </Button>
    </div>
  );
}
