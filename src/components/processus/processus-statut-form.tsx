"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateProcessusStatut, createProcessusVersion } from "@/actions/processus.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  ARCHIVE: "Archivé",
};

export function ProcessusStatutForm({ processusId, statut }: { processusId: string; statut: string }) {
  const [note, setNote] = useState("");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const { run: updateStatut, isPending: updatingStatut } = useAction(updateProcessusStatut, {
    successMessage: "Statut mis à jour.",
  });
  const { run: newVersion, isPending: creatingVersion } = useAction(createProcessusVersion, {
    successMessage: "Nouvelle version enregistrée.",
  });

  function handleStatutChange(v: string) {
    if (v === "ARCHIVE") {
      setArchiveDialogOpen(true);
      return;
    }
    updateStatut(processusId, v as "BROUILLON" | "ACTIF" | "ARCHIVE");
  }

  async function handleConfirmArchive() {
    const result = await updateStatut(processusId, "ARCHIVE", motif.trim() || undefined);
    if (result.ok) {
      setMotif("");
      setArchiveDialogOpen(false);
    }
  }

  async function handleNewVersion() {
    const result = await newVersion(processusId, note.trim() || undefined);
    if (result.ok) setNote("");
  }

  return (
    <div className="space-y-3">
      <Select value={statut} onValueChange={handleStatutChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <Input placeholder="Note de version (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" className="w-full" onClick={handleNewVersion} disabled={creatingVersion}>
          {creatingVersion ? "Enregistrement..." : "Enregistrer une nouvelle version"}
        </Button>
      </div>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver ce processus</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Le motif est conservé dans la mémoire organisationnelle, pour pouvoir répondre plus tard à « pourquoi
              avons-nous arrêté cette procédure ? ».
            </p>
            <Textarea
              placeholder="Motif d'archivage (optionnel)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmArchive} disabled={updatingStatut}>
              {updatingStatut ? "Archivage..." : "Archiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
