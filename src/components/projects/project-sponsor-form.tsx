"use client";

import { useAction } from "@/hooks/use-action";
import { updateProjectSponsor } from "@/actions/project.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };

export function ProjectSponsorForm({
  projectId,
  users,
  initialSponsorId,
}: {
  projectId: string;
  users: Option[];
  initialSponsorId: string | null;
}) {
  const { run } = useAction(updateProjectSponsor, { successMessage: "Sponsor mis à jour." });

  return (
    <Select
      value={initialSponsorId ?? undefined}
      onValueChange={(v) => run({ projectId, sponsorId: v })}
    >
      <SelectTrigger className="h-8 w-full max-w-xs">
        <SelectValue placeholder="Non désigné" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
