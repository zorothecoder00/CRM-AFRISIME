"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { createActivityReport } from "@/actions/activity-report.actions";
import { createActivityReportSchema, type CreateActivityReportInput } from "@/lib/validations/activity-report.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileCheck2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

/** /rapports, bloc "Rapports d'activité (manuels)" — import d'un fichier rédigé hors de l'application (réutilise l'endpoint documentUploader, mêmes types acceptés). */
export function ActivityReportUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateActivityReportInput>({ resolver: zodResolver(createActivityReportSchema) });
  const { run: submit, isPending } = useAction(createActivityReport, { successMessage: "Rapport importé." });

  async function onSubmit(data: CreateActivityReportInput) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      setUploadedFileName(null);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1 h-4 w-4" />
          Importer un rapport
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer un rapport d&apos;activité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
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
                if (!getValues("titre")) {
                  setValue("titre", file.name, { shouldValidate: true });
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Import..." : "Importer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
