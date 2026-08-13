"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { linkTaskExternalContact } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Option = { id: string; label: string };

/** Délègue cette tâche comme mission à un contact CRM externe (§XXI), ou retire la délégation. */
export function LinkMissionForm({
  taskId,
  candidates,
  hasMission,
}: {
  taskId: string;
  candidates: Option[];
  hasMission: boolean;
}) {
  const [externalContactId, setExternalContactId] = useState<string | undefined>();
  const { run, isPending } = useAction(linkTaskExternalContact, { successMessage: "Mission assignée." });

  async function handleLink() {
    if (!externalContactId) return;
    const result = await run({ taskId, externalContactId });
    if (result.ok) setExternalContactId(undefined);
  }

  async function handleUnlink() {
    await run({ taskId });
  }

  return (
    <div className="flex items-center gap-2">
      {candidates.length > 0 && (
        <Select value={externalContactId} onValueChange={setExternalContactId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Déléguer à un contact externe" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button onClick={handleLink} disabled={!externalContactId || isPending} size="sm">
        Assigner
      </Button>
      {hasMission && (
        <Button
          onClick={handleUnlink}
          disabled={isPending}
          variant="ghost"
          size="icon-sm"
          aria-label="Retirer la délégation"
          title="Retirer la délégation"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
