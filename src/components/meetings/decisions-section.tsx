"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { addDecision } from "@/actions/meeting.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

export type DecisionData = {
  id: string;
  description: string;
  responsableName: string | null;
  echeance: string | null;
  taskId: string | null;
};

export function DecisionsSection({
  meetingId,
  decisions,
  users,
}: {
  meetingId: string;
  decisions: DecisionData[];
  users: Option[];
}) {
  const [description, setDescription] = useState("");
  const [responsableId, setResponsableId] = useState<string | undefined>();
  const [echeance, setEcheance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!description.trim() || !responsableId) return;
    setIsSubmitting(true);
    try {
      await addDecision({
        meetingId,
        description: description.trim(),
        responsableId,
        echeance: echeance || undefined,
      });
      setDescription("");
      setResponsableId(undefined);
      setEcheance("");
      toast.success("Décision ajoutée, tâche créée automatiquement.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <div key={d.id} className="rounded-md border p-3 text-sm">
          <p className="font-medium">{d.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.responsableName && <span>Responsable : {d.responsableName}</span>}
            {d.echeance && <span>Échéance : {new Date(d.echeance).toLocaleDateString("fr-FR")}</span>}
            {d.taskId && (
              <Link href={`/taches/${d.taskId}`}>
                <Badge variant="secondary">Tâche créée</Badge>
              </Link>
            )}
          </div>
        </div>
      ))}
      {decisions.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune décision enregistrée.</p>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <Input
          placeholder="Décision / action à réaliser..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={responsableId} onValueChange={setResponsableId}>
            <SelectTrigger>
              <SelectValue placeholder="Responsable (requis)" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Une tâche est automatiquement créée et assignée au responsable choisi.
        </p>
        <Button size="sm" onClick={handleAdd} disabled={isSubmitting || !description.trim() || !responsableId}>
          {isSubmitting ? "Ajout..." : "Ajouter la décision"}
        </Button>
      </div>
    </div>
  );
}
