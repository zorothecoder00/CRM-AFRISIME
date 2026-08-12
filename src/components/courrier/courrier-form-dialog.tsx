"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAction } from "@/hooks/use-action";
import { createCourrier, updateCourrier } from "@/actions/courrier.actions";
import { createCourrierSchema, type CreateCourrierInput } from "@/lib/validations/courrier.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadButton } from "@/lib/uploadthing";
import { Plus, Pencil, FileCheck2 } from "lucide-react";

type Option = { id: string; label: string };
type CourrierEdit = {
  id: string;
  objet: string;
  type: CreateCourrierInput["type"];
  confidentiel: boolean;
  dateCourrier: string;
  expediteur: string | null;
  destinataire: string | null;
  departmentId: string | null;
  responsableId: string | null;
  documentUrl: string | null;
  documentNom: string | null;
  notes: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  ENTRANT: "Entrant",
  SORTANT: "Sortant",
  INTERNE: "Interne",
};

export function CourrierFormDialog({
  departments,
  users,
  courrier,
}: {
  departments: Option[];
  users: Option[];
  /** Présent = mode édition. Absent = création. */
  courrier?: CourrierEdit;
}) {
  const isEdit = !!courrier;
  const [open, setOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(courrier?.documentNom ?? null);
  const [confidentiel, setConfidentiel] = useState(courrier?.confidentiel ?? false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCourrierInput>({
    resolver: zodResolver(createCourrierSchema),
    defaultValues: courrier
      ? {
          objet: courrier.objet,
          type: courrier.type,
          confidentiel: courrier.confidentiel,
          dateCourrier: courrier.dateCourrier,
          expediteur: courrier.expediteur ?? undefined,
          destinataire: courrier.destinataire ?? undefined,
          departmentId: courrier.departmentId ?? undefined,
          responsableId: courrier.responsableId ?? undefined,
          documentUrl: courrier.documentUrl ?? undefined,
          documentNom: courrier.documentNom ?? undefined,
          notes: courrier.notes ?? undefined,
        }
      : { type: "ENTRANT" },
  });
  const { run: createRun, isPending: isCreating } = useAction(createCourrier, {
    successMessage: "Courrier enregistré.",
  });
  const { run: updateRun, isPending: isUpdating } = useAction(updateCourrier, {
    successMessage: "Courrier mis à jour.",
  });
  const isPending = isCreating || isUpdating;

  async function onSubmit(data: CreateCourrierInput) {
    const result = isEdit ? await updateRun({ ...data, id: courrier.id }) : await createRun(data);
    if (result.ok) {
      reset();
      setUploadedFileName(null);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier" title="Modifier">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau courrier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le courrier" : "Enregistrer un courrier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objet">Objet</Label>
            <Input id="objet" {...register("objet")} />
            {errors.objet && <p className="text-sm text-destructive">{errors.objet.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue={courrier?.type ?? "ENTRANT"}
                onValueChange={(v) => setValue("type", v as CreateCourrierInput["type"])}
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
            <div className="space-y-2">
              <Label htmlFor="dateCourrier">Date</Label>
              <Input id="dateCourrier" type="date" {...register("dateCourrier")} />
              {errors.dateCourrier && (
                <p className="text-sm text-destructive">{errors.dateCourrier.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expediteur">Expéditeur</Label>
              <Input id="expediteur" {...register("expediteur")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinataire">Destinataire</Label>
              <Input id="destinataire" {...register("destinataire")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Département concerné</Label>
              <Select
                defaultValue={courrier?.departmentId ?? undefined}
                onValueChange={(v) => setValue("departmentId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                defaultValue={courrier?.responsableId ?? undefined}
                onValueChange={(v) => setValue("responsableId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="confidentiel"
              checked={confidentiel}
              onCheckedChange={(c) => {
                const value = c === true;
                setConfidentiel(value);
                setValue("confidentiel", value);
              }}
            />
            <Label htmlFor="confidentiel" className="font-normal">
              Courrier confidentiel (visible uniquement du créateur, du responsable et des gestionnaires)
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Fichier joint</Label>
            <input type="hidden" {...register("documentUrl")} />
            <UploadButton
              endpoint="documentUploader"
              onClientUploadComplete={(res) => {
                const file = res[0];
                if (!file) return;
                setValue("documentUrl", file.ufsUrl);
                setValue("documentNom", file.name);
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Enregistrer le courrier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
