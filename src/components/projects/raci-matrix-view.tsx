"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { createRaciAssignment, deleteRaciAssignment } from "@/actions/raci.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, X } from "lucide-react";

type Option = { id: string; label: string };

export type RaciAssignmentData = {
  id: string;
  userId: string;
  userName: string;
  role: "RESPONSIBLE" | "ACCOUNTABLE" | "CONSULTED" | "INFORMED";
};

export type RaciSectionData = {
  id: string;
  nom: string;
  assignments: RaciAssignmentData[];
};

export type RaciConsistencyIssueData = {
  userName: string;
  ancestorSectionNom: string;
  descendantSectionNom: string;
};

const ROLE_LABELS: Record<RaciAssignmentData["role"], string> = {
  RESPONSIBLE: "R",
  ACCOUNTABLE: "A",
  CONSULTED: "C",
  INFORMED: "I",
};
const ROLE_FULL_LABELS: Record<RaciAssignmentData["role"], string> = {
  RESPONSIBLE: "Responsible",
  ACCOUNTABLE: "Accountable",
  CONSULTED: "Consulted",
  INFORMED: "Informed",
};
const ROLES: RaciAssignmentData["role"][] = ["RESPONSIBLE", "ACCOUNTABLE", "CONSULTED", "INFORMED"];

/** RACI Matrix (Project Studio §21) — Responsible/Accountable/Consulted/Informed par activité WBS. */
export function RaciMatrixView({
  sections,
  users,
  issues,
  canManage,
}: {
  sections: RaciSectionData[];
  users: Option[];
  issues: RaciConsistencyIssueData[];
  canManage: boolean;
}) {
  const { run: remove } = useAction(deleteRaciAssignment, { successMessage: "Assignation retirée." });

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune activité (WBS) définie pour ce projet.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pour chaque activité : qui est Responsible, Accountable, Consulted, Informed.
      </p>

      {issues.length > 0 && (
        <Card accent="warning">
          <CardContent className="space-y-1 px-(--card-spacing)">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Incohérences détectées
            </div>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {issues.map((issue, i) => (
                <li key={i}>
                  {issue.userName} est Accountable à la fois sur « {issue.ancestorSectionNom} » et sur « {issue.descendantSectionNom} »
                  (qui en dépend).
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Activité</th>
              {ROLES.map((role) => (
                <th key={role} className="p-2" title={ROLE_FULL_LABELS[role]}>
                  {ROLE_LABELS[role]}
                </th>
              ))}
              {canManage && <th className="p-2" />}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-b align-top">
                <td className="p-2 font-medium">{section.nom}</td>
                {ROLES.map((role) => (
                  <td key={role} className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {section.assignments
                        .filter((a) => a.role === role)
                        .map((a) => (
                          <Badge key={a.id} variant="outline" className="gap-1">
                            {a.userName}
                            {canManage && (
                              <button type="button" onClick={() => remove({ assignmentId: a.id })} aria-label="Retirer">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                    </div>
                  </td>
                ))}
                {canManage && (
                  <td className="p-2">
                    <AssignDialog sectionId={section.id} users={users} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssignDialog({ sectionId, users }: { sectionId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [role, setRole] = useState<RaciAssignmentData["role"]>("RESPONSIBLE");
  const { run: assign, isPending } = useAction(createRaciAssignment, { successMessage: "Assigné." });

  async function handleAssign() {
    if (!userId) return;
    const result = await assign({ sectionId, userId, role });
    if (result.ok) {
      setUserId(undefined);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Assigner">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assigner un rôle RACI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Personne</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
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
            <Label>Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RaciAssignmentData["role"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_FULL_LABELS[r]} ({ROLE_LABELS[r]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={isPending || !userId} onClick={handleAssign}>
            Assigner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
