"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { addTeamMember, removeTeamMember } from "@/actions/team.actions";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Option = { id: string; label: string };

export function TeamMemberManager({
  teamId,
  members,
  availableUsers,
}: {
  teamId: string;
  members: Option[];
  availableUsers: Option[];
}) {
  const [value, setValue] = useState("");
  const { run: add } = useAction(addTeamMember);
  const { run: remove } = useAction(removeTeamMember);

  const remainingUsers = availableUsers.filter((u) => !members.some((m) => m.id === u.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {members.length === 0 && <span className="text-xs text-muted-foreground">Aucun membre.</span>}
        {members.map((m) => (
          <Badge key={m.id} variant="secondary" className="gap-1">
            {m.label}
            <button
              type="button"
              onClick={() => remove({ teamId, userId: m.id })}
              aria-label={`Retirer ${m.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {remainingUsers.length > 0 && (
        <Select
          value={value}
          onValueChange={(v) => {
            setValue("");
            add({ teamId, userId: v });
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Ajouter un membre..." />
          </SelectTrigger>
          <SelectContent>
            {remainingUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
