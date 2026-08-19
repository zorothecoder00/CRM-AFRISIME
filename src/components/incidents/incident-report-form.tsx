"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createIncident } from "@/actions/incident.actions";
import { INCIDENT_TYPES, INCIDENT_CRITICITES } from "@/lib/validations/incident.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";
import { TriangleAlert, X } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  ORGANISATIONNEL: "Organisationnel",
  INFORMATIQUE: "Informatique",
  CLIENT: "Client",
  PROJET: "Projet",
  QUALITE: "Qualité",
  SECURITE: "Sécurité",
  OPERATIONNEL: "Opérationnel",
};

// Signalement d'incident — pensé mobile-first (cahier des charges V3.0
// §42) : gros champs, minimum de saisie requise, disponible sans permission
// spécifique pour que tout collaborateur terrain puisse déclarer un
// incident immédiatement.
export function IncidentReportForm({ projects }: { projects: { id: string; label: string }[] }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof INCIDENT_TYPES)[number]>("OPERATIONNEL");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [criticite, setCriticite] = useState<(typeof INCIDENT_CRITICITES)[number]>("MODERE");
  const [projectId, setProjectId] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const { run, isPending } = useAction(createIncident, { successMessage: "Incident signalé." });

  async function handleSubmit() {
    if (!titre.trim()) return;
    const result = await run({
      type,
      titre: titre.trim(),
      description: description.trim() || undefined,
      criticite,
      projectId: projectId || undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
    if (result.ok) {
      setTitre("");
      setDescription("");
      setPhotos([]);
      router.refresh();
    }
  }

  return (
    <Card accent="warning">
      <CardHeader className="flex flex-row items-center gap-2">
        <TriangleAlert className="size-5 text-warning" />
        <CardTitle className="text-base">Signaler un incident</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Titre</Label>
          <Input placeholder="Que s'est-il passé ?" value={titre} onChange={(e) => setTitre(e.target.value)} className="h-12 text-base" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gravité</Label>
            <Select value={criticite} onValueChange={(v) => setCriticite(v as typeof criticite)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_CRITICITES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <Label>Projet concerné (optionnel)</Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Photos</Label>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Photo de l'incident" className="h-16 w-16 rounded-md border object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <UploadButton
              endpoint="incidentPhotoUploader"
              onClientUploadComplete={(res) => {
                setPhotos((prev) => [...prev, ...res.map((f) => f.url)]);
                toast.success("Photo(s) ajoutée(s).");
              }}
              onUploadError={(uploadError) => {
                toast.error(`Échec du téléversement : ${uploadError.message}`);
              }}
            />
          )}
        </div>
        <Button onClick={handleSubmit} disabled={!titre.trim() || isPending} className="h-12 w-full text-base">
          {isPending ? "Envoi..." : "Signaler"}
        </Button>
      </CardContent>
    </Card>
  );
}
