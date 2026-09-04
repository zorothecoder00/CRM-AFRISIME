"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { deleteTask } from "@/actions/trash.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { MultiAddSubtaskForm } from "@/components/tasks/multi-add-subtask-form";
import { toneForTaskStatus, toneForPriority } from "@/lib/status-tone";
import { Plus } from "lucide-react";

export type SubtaskRow = {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  responsablePrincipalId: string;
  responsableNom: string;
  assigneeIds: string[];
  dateDebut: string | null;
  echeance: string | null;
  tempsEstimeHeures: number | null;
  // Demande utilisateur — poids (%) de cette sous-tâche dans le calcul de
  // l'avancement de la mère ; null = calcul automatique (voir
  // recomputeParentTaskFromSubtasks).
  poidsAvancement: number | null;
};

type Option = { id: string; label: string };

const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

const PRIORITY_LABELS: Record<string, string> = {
  TRES_HAUTE: "Très haute",
  HAUTE: "Haute",
  MOYENNE: "Moyenne",
  BASSE: "Basse",
};

/**
 * Section "Sous-tâches" de la fiche tâche — ajout/édition/suppression, la
 * tâche étant son propre modèle auto-référencé. Pas de copie locale de la
 * liste (contrairement à un tableau avec drag-and-drop) : `subtasks` est lu
 * directement depuis les props à chaque rendu, comme Checklist, pour
 * refléter automatiquement toute mutation qui revalide cette page — y
 * compris une sous-tâche créée depuis un autre composant (voir
 * convertChecklistItemToSubtask).
 */
export function SubtasksSection({
  parentTaskId,
  parentDateDebut,
  parentEcheance,
  parentResponsablePrincipalId,
  subtasks,
  members,
  canManage,
  canDelete,
  currentUserId,
  onChanged,
}: {
  parentTaskId: string;
  parentDateDebut: string | null;
  parentEcheance: string | null;
  // Demande utilisateur — celui qui fait la tâche mère fait par défaut ses
  // subdivisions aussi.
  parentResponsablePrincipalId: string;
  subtasks: SubtaskRow[];
  members: Option[];
  canManage: boolean;
  canDelete: boolean;
  /** Responsable principal ou co-responsable d'une sous-tâche : peut changer
   * SON statut même sans TASK_UPDATE (voir updateTaskStatus), comme sur la
   * fiche de la sous-tâche elle-même. */
  currentUserId: string;
  /** Demande utilisateur — panneau dépliable de mes-tâches : la liste de
   * sous-tâches y est un état local (pas rechargée par simple navigation),
   * ce callback permet au parent de la rafraîchir après ajout/suppression. */
  onChanged?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { run: remove } = useAction(deleteTask, { successMessage: "Sous-tâche supprimée." });

  async function handleRemove(id: string) {
    const result = await remove(id);
    if (result.ok) onChanged?.();
  }

  const editingSubtask = subtasks.find((s) => s.id === editingId) ?? null;

  return (
    <div className="space-y-3">
      {subtasks.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aucune sous-tâche.</p>
      )}
      {subtasks.map((s) => {
        const isOwnSubtask = s.responsablePrincipalId === currentUserId || s.assigneeIds.includes(currentUserId);
        const canChangeThisStatus = canManage || isOwnSubtask;
        return (
        <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
          <div className="min-w-0 flex-1">
            <Link href={`/taches/${s.id}`} className="text-sm font-medium hover:underline">
              {s.titre}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {canChangeThisStatus ? (
                <TaskStatusSelect taskId={s.id} statut={s.statut} />
              ) : (
                <Badge variant={toneForTaskStatus(s.statut)} className="text-[10px]">
                  {STATUS_LABELS[s.statut]}
                </Badge>
              )}
              <Badge variant={toneForPriority(s.priorite)} className="text-[10px]">
                {PRIORITY_LABELS[s.priorite]}
              </Badge>
              {s.poidsAvancement !== null && (
                <Badge variant="outline" className="text-[10px]">
                  Poids : {s.poidsAvancement}%
                </Badge>
              )}
              <span>{s.responsableNom}</span>
              {s.dateDebut && <span>Début : {new Date(s.dateDebut).toLocaleDateString("fr-FR")}</span>}
              {s.echeance && <span>Échéance : {new Date(s.echeance).toLocaleDateString("fr-FR")}</span>}
            </div>
          </div>
          {(canManage || canDelete) && (
            <RowActionsMenu
              onEdit={canManage ? () => setEditingId(s.id) : undefined}
              onDelete={canDelete ? () => handleRemove(s.id) : undefined}
              deleteConfirmLabel={`Supprimer « ${s.titre} » ? La sous-tâche sera déplacée dans la corbeille.`}
            />
          )}
        </div>
        );
      })}

      {canManage && (
        <>
          {showForm ? (
            <div className="rounded-md border p-3">
              <MultiAddSubtaskForm
                parentTaskId={parentTaskId}
                parentDateDebut={parentDateDebut}
                parentEcheance={parentEcheance}
                parentResponsablePrincipalId={parentResponsablePrincipalId}
                users={members}
                currentUserId={currentUserId}
                onDone={() => {
                  setShowForm(false);
                  onChanged?.();
                }}
              />
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Fermer
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
          task={{ ...editingSubtask, parentTaskId }}
          users={members}
          open={!!editingId}
          onOpenChange={(o) => setEditingId(o ? editingId : null)}
          onSuccess={() => onChanged?.()}
        />
      )}
    </div>
  );
}
