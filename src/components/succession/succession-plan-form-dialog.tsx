"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createSuccessionPlan } from "@/actions/succession.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function SuccessionPlanFormDialog({
  postes,
  users,
}: {
  postes: { id: string; label: string }[];
  users: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [posteId, setPosteId] = useState("");
  const [titulaireId, setTitulaireId] = useState("");
  const [competencesRequises, setCompetencesRequises] = useState("");
  const [notes, setNotes] = useState("");
  const { run, isPending } = useAction(createSuccessionPlan, { successMessage: "Plan de succession créé." });

  async function handleSubmit() {
    if (!posteId) return;
    const result = await run({
      posteId,
      titulaireId: titulaireId || undefined,
      competencesRequises: competencesRequises.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (result.ok) {
      setOpen(false);
      setPosteId("");
      setTitulaireId("");
      setCompetencesRequises("");
      setNotes("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Nouveau plan de succession
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau plan de succession</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Poste critique</Label>
            <Select value={posteId} onValueChange={setPosteId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un poste" />
              </SelectTrigger>
              <SelectContent>
                {postes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Titulaire actuel</Label>
            <Select value={titulaireId || "none"} onValueChange={(v) => setTitulaireId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Compétences requises</Label>
            <Textarea rows={2} value={competencesRequises} onChange={(e) => setCompetencesRequises(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!posteId || isPending} className="w-full">
            {isPending ? "Création..." : "Créer le plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
