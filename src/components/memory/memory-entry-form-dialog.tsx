"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createMemoryEntry } from "@/actions/organizational-memory.actions";
import { ORGANIZATIONAL_MEMORY_TYPES } from "@/lib/validations/organizational-memory.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const TYPE_LABELS: Record<(typeof ORGANIZATIONAL_MEMORY_TYPES)[number], string> = {
  DECISION: "Décision",
  PROJET: "Projet",
  SUCCES: "Succès",
  ECHEC: "Échec",
  INCIDENT: "Incident",
  RECOMMANDATION: "Recommandation",
  PROCEDURE: "Procédure",
  EXPERIENCE: "Expérience / retour d'expérience",
  TRANSFORMATION: "Transformation",
};

// Organizational Memory (cahier des charges V3.0 §18) — saisie manuelle pour
// les succès/échecs/expériences qui n'ont pas d'entité applicative dédiée
// (contrairement aux décisions de réunion ou aux procédures archivées, déjà
// capturées automatiquement — voir organizational-memory.ts).
export function MemoryEntryFormDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof ORGANIZATIONAL_MEMORY_TYPES)[number]>("EXPERIENCE");
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const { run, isPending } = useAction(createMemoryEntry, { successMessage: "Entrée ajoutée à la mémoire organisationnelle." });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await run({ type, titre, contenu });
    if (result.ok) {
      setTitre("");
      setContenu("");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouvelle entrée
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une entrée à la mémoire organisationnelle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as (typeof ORGANIZATIONAL_MEMORY_TYPES)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATIONAL_MEMORY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titre</Label>
            <Input placeholder="Ex. Échec du déploiement CRM v1" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Contenu</Label>
            <Textarea
              placeholder="Contexte, ce qui s'est passé, ce qu'il faut en retenir…"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={5}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Ajouter à la mémoire"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
