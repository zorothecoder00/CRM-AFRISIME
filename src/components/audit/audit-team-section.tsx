"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addAuditPlanMember, removeAuditPlanMember } from "@/actions/audit.actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export type AuditPlanMemberRow = { id: string; userId: string; userName: string };
type Option = { id: string; label: string };

export function AuditTeamSection({
  planId,
  members,
  users,
  canManage,
}: {
  planId: string;
  members: AuditPlanMemberRow[];
  users: Option[];
  canManage: boolean;
}) {
  const [userId, setUserId] = useState<string | undefined>();
  const { run: add, isPending: adding } = useAction(addAuditPlanMember, { successMessage: "Membre ajouté à l'équipe." });
  const { run: remove } = useAction(removeAuditPlanMember, { successMessage: "Membre retiré de l'équipe." });

  const availableUsers = users.filter((u) => !members.some((m) => m.userId === u.id));

  async function handleAdd() {
    if (!userId) return;
    const result = await add({ planId, userId });
    if (result.ok) setUserId(undefined);
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Ajouter un membre..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!userId || adding}>
            Ajouter
          </Button>
        </div>
      )}
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            {m.userName}
            {canManage && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(m.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </li>
        ))}
        {members.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre dans l&apos;équipe d&apos;audit.</p>}
      </ul>
    </div>
  );
}
