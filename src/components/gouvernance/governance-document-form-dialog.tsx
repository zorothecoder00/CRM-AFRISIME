"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { addGovernanceMeetingDocument } from "@/actions/gouvernance.actions";
import {
  addGovernanceMeetingDocumentSchema,
  type AddGovernanceMeetingDocumentInput,
} from "@/lib/validations/gouvernance.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, FileCheck2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

export function GovernanceDocumentFormDialog({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<AddGovernanceMeetingDocumentInput>({
    resolver: zodResolver(addGovernanceMeetingDocumentSchema),
    defaultValues: { meetingId },
  });
  const { run: submit, isPending } = useAction(addGovernanceMeetingDocument, {
    successMessage: "Document ajouté.",
  });

  async function onSubmit(data: AddGovernanceMeetingDocumentInput) {
    const result = await submit({ ...data, meetingId });
    if (result.ok) {
      reset({ meetingId });
      setUploadedFileName(null);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document préparatoire</DialogTitle>
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
