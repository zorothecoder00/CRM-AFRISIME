"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { depositPortalDocument } from "@/actions/document.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadButton } from "@/lib/uploadthing";
import { FileCheck2, Upload } from "lucide-react";

export function PortalDocumentUploadForm({ taskId }: { taskId: string }) {
  const [nom, setNom] = useState("");
  const [file, setFile] = useState<{ url: string; mimeType: string; sizeBytes: number } | null>(null);
  const { run: submit, isPending } = useAction(depositPortalDocument, {
    successMessage: "Document déposé.",
  });

  async function handleSubmit() {
    if (!file || !nom.trim()) return;
    const result = await submit({
      taskId,
      nom: nom.trim(),
      url: file.url,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });
    if (result.ok) {
      setNom("");
      setFile(null);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <Label className="text-xs text-muted-foreground">Déposer un document</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Nom du document"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="max-w-xs"
        />
        <UploadButton
          endpoint="portalDocumentUploader"
          appearance={{ button: "h-9" }}
          content={{ button: <span className="flex items-center gap-1"><Upload className="h-4 w-4" /> Choisir un fichier</span> }}
          onClientUploadComplete={(res) => {
            const uploaded = res[0];
            if (!uploaded) return;
            setFile({ url: uploaded.ufsUrl, mimeType: uploaded.type, sizeBytes: uploaded.size });
            if (!nom.trim()) setNom(uploaded.name);
            toast.success("Fichier téléversé.");
          }}
          onUploadError={(error) => {
            toast.error(`Échec du téléversement : ${error.message}`);
          }}
        />
        <Button size="sm" onClick={handleSubmit} disabled={!file || !nom.trim() || isPending}>
          {isPending ? "Envoi..." : "Déposer"}
        </Button>
      </div>
      {file && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileCheck2 className="h-3.5 w-3.5" /> Fichier prêt à être déposé
        </p>
      )}
    </div>
  );
}
