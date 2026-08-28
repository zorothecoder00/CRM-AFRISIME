"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { requestTaskReassignment } from "@/actions/personal-planning.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ReassignableEntry = { id: string; titre: string };
export type ColleagueOption = { id: string; label: string };

/** §16 option 4 — choix de l'activité surchargée et du collègue à qui demander de la reprendre. */
export function RequestReassignmentDialog({
  open,
  onOpenChange,
  entries,
  colleagues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ReassignableEntry[];
  colleagues: ColleagueOption[];
}) {
  const [entryId, setEntryId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const { run: submit, isPending } = useAction(requestTaskReassignment, { successMessage: "Demande envoyée." });

  async function onSubmit() {
    if (!entryId || !targetUserId) return;
    const result = await submit({ entryId, targetUserId });
    if (result.ok) {
      setEntryId("");
      setTargetUserId("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander une réaffectation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Le collègue choisi recevra une notification lui proposant de reprendre la tâche — rien n&apos;est réaffecté automatiquement.
          </p>
          <div className="space-y-1.5">
            <Label>Activité</Label>
            <Select value={entryId} onValueChange={setEntryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une activité" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Collègue</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un collègue" />
              </SelectTrigger>
              <SelectContent>
                {colleagues.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!entryId || !targetUserId || isPending} onClick={onSubmit}>
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
