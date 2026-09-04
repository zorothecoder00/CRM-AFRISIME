"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiAddSubtaskForm } from "@/components/tasks/multi-add-subtask-form";

type Option = { id: string; label: string };

/**
 * Subdiviser une tâche en sous-tâches directement depuis un tableau (liste
 * de tâches) — sans passer par sa fiche complète. Demande utilisateur :
 * l'avancement (%) affiché dans le tableau se déduit de la moyenne des
 * sous-tâches (voir recomputeParentTaskFromSubtasks) dès qu'il y en a au
 * moins une, d'où le besoin de pouvoir en ajouter plusieurs d'un coup
 * (voir MultiAddSubtaskForm).
 */
export function AddSubtaskDialog({
  parentTaskId,
  parentTitre,
  parentDateDebut,
  parentEcheance,
  parentResponsablePrincipalId,
  users,
  currentUserId,
  open,
  onOpenChange,
}: {
  parentTaskId: string;
  parentTitre: string;
  parentDateDebut: string | null;
  parentEcheance: string | null;
  parentResponsablePrincipalId: string;
  users: Option[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subdiviser « {parentTitre} »</DialogTitle>
        </DialogHeader>
        <MultiAddSubtaskForm
          parentTaskId={parentTaskId}
          parentDateDebut={parentDateDebut}
          parentEcheance={parentEcheance}
          parentResponsablePrincipalId={parentResponsablePrincipalId}
          users={users}
          currentUserId={currentUserId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
