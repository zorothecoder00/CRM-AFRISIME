"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addSubtask } from "@/actions/task.actions";
import type { AddSubtaskInput } from "@/lib/validations/task.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

/**
 * Subdiviser une tâche en sous-tâches directement depuis un tableau (liste
 * de tâches) — sans passer par sa fiche complète. Demande utilisateur :
 * l'avancement (%) affiché dans le tableau se déduit de la moyenne des
 * sous-tâches (voir recomputeParentTaskFromSubtasks) dès qu'il y en a au
 * moins une, d'où le besoin de pouvoir en ajouter vite, ligne par ligne.
 */
export function AddSubtaskDialog({
  parentTaskId,
  parentTitre,
  users,
  open,
  onOpenChange,
}: {
  parentTaskId: string;
  parentTitre: string;
  users: Option[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [titre, setTitre] = useState("");
  const [responsablePrincipalId, setResponsablePrincipalId] = useState("");
  const [priorite, setPriorite] = useState<NonNullable<AddSubtaskInput["priorite"]>>("MOYENNE");
  const [dateDebut, setDateDebut] = useState("");
  const [echeance, setEcheance] = useState("");
  const { run: create, isPending } = useAction(addSubtask, { successMessage: "Sous-tâche ajoutée." });

  function reset() {
    setTitre("");
    setResponsablePrincipalId("");
    setPriorite("MOYENNE");
    setDateDebut("");
    setEcheance("");
  }

  async function handleAdd() {
    if (!titre.trim() || !responsablePrincipalId) return;
    const result = await create({
      parentTaskId,
      titre: titre.trim(),
      responsablePrincipalId,
      priorite,
      dateDebut: dateDebut || undefined,
      echeance: echeance || undefined,
    });
    if (result.ok) {
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subdiviser « {parentTitre} »</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="subtask-titre">Titre de la sous-tâche</Label>
            <Input id="subtask-titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Rédiger la première partie" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={responsablePrincipalId} onValueChange={setResponsablePrincipalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
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
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priorite} onValueChange={(v) => setPriorite(v as NonNullable<AddSubtaskInput["priorite"]>)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRES_HAUTE">Très haute</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="BASSE">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subtask-debut">Date de début</Label>
              <Input id="subtask-debut" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtask-echeance">Échéance</Label>
              <Input id="subtask-echeance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
          </div>
          <Button type="button" className="w-full" disabled={isPending || !titre.trim() || !responsablePrincipalId} onClick={handleAdd}>
            {isPending ? "Ajout..." : "Ajouter la sous-tâche"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
