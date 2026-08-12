"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
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
  const { run, isPending } = useAction(addDocumentVersion, {
    successMessage: "Nouvelle version enregistrée.",
  });

  async function handleSubmit() {
    if (!url.trim()) return;
    const result = await run({
      documentId,
      url: url.trim(),
      mimeType,
      sizeBytes,
      note: note.trim() || undefined,
    });
    if (result.ok) {
      setUrl("");
      setMimeType(undefined);
      setSizeBytes(undefined);
      setFileName(null);
      setNote("");
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
      <Button size="sm" onClick={handleSubmit} disabled={isPending || !url.trim()}>
        {isPending ? "Enregistrement..." : "Ajouter une nouvelle version"}
      </Button>
    </div>
  );
}
