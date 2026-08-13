"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { createDocument } from "@/actions/document.actions";
import { createDocumentSchema, type CreateDocumentInput } from "@/lib/validations/document.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileCheck2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

type Option = { id: string; label: string };

const TYPE_LABELS: Record<string, string> = {
  AUTRE: "Autre",
  CONTRAT: "Contrat",
  RAPPORT: "Rapport",
  FACTURE: "Facture",
  PROCES_VERBAL: "Procès-verbal",
  LIVRABLE: "Livrable",
};

export function DocumentFormDialog({
  projectId,
  folders,
  currentFolderId,
  sectionId,
  taskId,
  meetingId,
  triggerLabel = "Nouveau document",
}: {
  projectId: string;
  folders?: Option[];
  currentFolderId?: string;
  sectionId?: string;
  taskId?: string;
  meetingId?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateDocumentInput>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: { projectId, folderId: currentFolderId, sectionId, taskId, meetingId, type: "AUTRE" },
  });
  const { run: submit, isPending } = useAction(createDocument, { successMessage: "Document ajouté." });

  async function onSubmit(data: CreateDocumentInput) {
    const result = await submit({ ...data, projectId, sectionId, taskId, meetingId });
    if (result.ok) {
      reset();
      setUploadedFileName(null);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fichier</Label>
            <input type="hidden" {...register("url")} />
            <UploadButton
              endpoint="documentUploader"
              onClientUploadComplete={(res) => {
                const file = res[0];
                if (!file) return;
                setValue("url", file.ufsUrl, { shouldValidate: true });
                setValue("mimeType", file.type);
                setValue("sizeBytes", file.size);
                if (!getValues("nom")) {
                  setValue("nom", file.name, { shouldValidate: true });
                }
                setUploadedFileName(file.name);
                toast.success("Fichier téléversé.");
              }}
              onUploadError={(error) => {
                toast.error(`Échec du téléversement : ${error.message}`);
              }}
            />
            {uploadedFileName && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileCheck2 className="h-4 w-4" /> {uploadedFileName}
              </p>
            )}
            {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select
              defaultValue="AUTRE"
              onValueChange={(v) => setValue("type", v as CreateDocumentInput["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {folders && folders.length > 0 && (
            <div className="space-y-2">
              <Label>Dossier</Label>
              <Select
                defaultValue={currentFolderId}
                onValueChange={(v) => setValue("folderId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Racine (sans dossier)" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
