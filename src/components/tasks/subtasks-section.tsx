"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { addSubtask } from "@/actions/task.actions";
import type { AddSubtaskInput } from "@/lib/validations/task.schema";
import { deleteTask } from "@/actions/trash.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { toneForStatus, toneForPriority } from "@/lib/status-tone";
import { Plus } from "lucide-react";

export type SubtaskRow = {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  responsablePrincipalId: string;
  responsableNom: string;
  dateDebut: string | null;
  echeance: string | null;
  tempsEstimeHeures: number | null;
};

type Option = { id: string; label: string };

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

/** Section "Sous-tâches" de la fiche tâche — ajout/édition/suppression, la tâche étant son propre modèle auto-référencé. */
export function SubtasksSection({
  parentTaskId,
  subtasks: initial,
  members,
  canManage,
  canDelete,
}: {
  parentTaskId: string;
  subtasks: SubtaskRow[];
  members: Option[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const [subtasks, setSubtasks] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState("");
  const [responsablePrincipalId, setResponsablePrincipalId] = useState("");
  const [priorite, setPriorite] = useState<NonNullable<AddSubtaskInput["priorite"]>>("MOYENNE");
  const [dateDebut, setDateDebut] = useState("");
  const [echeance, setEcheance] = useState("");

  const { run: create, isPending } = useAction(addSubtask, { successMessage: "Sous-tâche ajoutée." });
  const { run: remove } = useAction(deleteTask, { successMessage: "Sous-tâche supprimée." });

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
      setSubtasks((prev) => [...prev, { ...result.data, description: null, tempsEstimeHeures: null }]);
      setTitre("");
      setResponsablePrincipalId("");
      setPriorite("MOYENNE");
      setDateDebut("");
      setEcheance("");
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    const result = await remove(id);
    if (result.ok) setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  const editingSubtask = subtasks.find((s) => s.id === editingId) ?? null;

  return (
    <div className="space-y-3">
      {subtasks.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aucune sous-tâche.</p>
      )}
      {subtasks.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
          <div className="min-w-0 flex-1">
            <Link href={`/taches/${s.id}`} className="text-sm font-medium hover:underline">
              {s.titre}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={toneForStatus(s.statut)} className="text-[10px]">
                {STATUS_LABELS[s.statut]}
              </Badge>
              <Badge variant={toneForPriority(s.priorite)} className="text-[10px]">
                {PRIORITY_LABELS[s.priorite]}
              </Badge>
              <span>{s.responsableNom}</span>
              {s.dateDebut && <span>Début : {new Date(s.dateDebut).toLocaleDateString("fr-FR")}</span>}
              {s.echeance && <span>Échéance : {new Date(s.echeance).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
          {(canManage || canDelete) && (
            <RowActionsMenu
              onEdit={canManage ? () => setEditingId(s.id) : undefined}
              onDelete={canDelete ? () => handleDelete(s.id) : undefined}
              deleteConfirmLabel={`Supprimer « ${s.titre} » ? La sous-tâche sera déplacée dans la corbeille.`}
            />
          )}
        </div>
      ))}

      {canManage && (
        <>
          {showForm ? (
            <div className="space-y-2 rounded-md border p-3">
              <Input
                placeholder="Titre de la sous-tâche"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={responsablePrincipalId} onValueChange={setResponsablePrincipalId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={priorite}
                  onValueChange={(v) => setPriorite(v as NonNullable<AddSubtaskInput["priorite"]>)}
                >
                  <SelectTrigger className="h-9 text-xs">
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Date de début</span>
                  <Input type="date" className="h-9 text-xs" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Échéance</span>
                  <Input type="date" className="h-9 text-xs" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button type="button" size="sm" onClick={handleAdd} disabled={isPending || !titre.trim() || !responsablePrincipalId}>
                  {isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ajouter une sous-tâche
            </Button>
          )}
        </>
      )}

      {editingSubtask && (
        <TaskEditDialog
          task={editingSubtask}
          users={members}
          open={!!editingId}
          onOpenChange={(o) => setEditingId(o ? editingId : null)}
          onSuccess={(updated) =>
            setSubtasks((prev) =>
              prev.map((s) =>
                s.id === editingSubtask.id
                  ? {
                      ...s,
                      titre: updated.titre,
                      priorite: updated.priorite,
                      responsablePrincipalId: updated.responsablePrincipalId,
                      responsableNom: members.find((m) => m.id === updated.responsablePrincipalId)?.label ?? s.responsableNom,
                      dateDebut: updated.dateDebut || null,
                      echeance: updated.echeance || null,
                    }
                  : s
              )
            )
          }
        />
      )}
    </div>
  );
}
