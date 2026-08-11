"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addDocumentVersion } from "@/actions/document.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadButton } from "@/lib/uploadthing";
import { FileCheck2 } from "lucide-react";

export function AddVersionForm({ documentId }: { documentId: string }) {
  const [url, setUrl] = useState("");
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [sizeBytes, setSizeBytes] = useState<number | undefined>(undefined);
  const [fileName, setFileName] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) return;
    setIsSubmitting(true);
    try {
      await addDocumentVersion({
        documentId,
        url: url.trim(),
        mimeType,
        sizeBytes,
        note: note.trim() || undefined,
      });
      setUrl("");
      setMimeType(undefined);
      setSizeBytes(undefined);
      setFileName(null);
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
      <UploadButton
        endpoint="documentUploader"
        onClientUploadComplete={(res) => {
          const file = res[0];
          if (!file) return;
          setUrl(file.ufsUrl);
          setMimeType(file.type);
          setSizeBytes(file.size);
          setFileName(file.name);
          toast.success("Fichier téléversé.");
        }}
        onUploadError={(error) => {
          toast.error(`Échec du téléversement : ${error.message}`);
        }}
      />
      {fileName && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <FileCheck2 className="h-4 w-4" /> {fileName}
        </p>
      )}
      <Input
        placeholder="Note de version (optionnel)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !url.trim()}>
        {isSubmitting ? "Enregistrement..." : "Ajouter une nouvelle version"}
      </Button>
    </div>
  );
}
