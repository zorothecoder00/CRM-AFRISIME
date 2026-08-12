"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { decideLeave } from "@/actions/calendar.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

export type PendingLeave = {
  id: string;
  userName: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  CONGE_PAYE: "Congé payé",
  MALADIE: "Maladie",
  AUTRE: "Autre",
};

export function PendingLeavesSection({ leaves }: { leaves: PendingLeave[] }) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const approveAction = useAction(decideLeave, { successMessage: "Congé approuvé." });
  const rejectAction = useAction(decideLeave, { successMessage: "Congé refusé." });

  async function handleDecide(leaveId: string, statut: "APPROUVE" | "REFUSE") {
    setPendingIds((prev) => new Set(prev).add(leaveId));
    const action = statut === "APPROUVE" ? approveAction : rejectAction;
    await action.run({ leaveId, statut });
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(leaveId);
      return next;
    });
  }

  if (leaves.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>;
  }

  return (
    <ul className="space-y-2">
      {leaves.map((leave) => (
        <li key={leave.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
          <div>
            <div className="font-medium">{leave.userName}</div>
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-1">
                {TYPE_LABELS[leave.type]}
              </Badge>
              {new Date(leave.dateDebut).toLocaleDateString("fr-FR")} → {new Date(leave.dateFin).toLocaleDateString("fr-FR")}
              {leave.motif ? ` · ${leave.motif}` : ""}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={pendingIds.has(leave.id)}
              onClick={() => handleDecide(leave.id, "APPROUVE")}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingIds.has(leave.id)}
              onClick={() => handleDecide(leave.id, "REFUSE")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
