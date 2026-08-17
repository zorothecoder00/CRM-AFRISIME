"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { inviteContactToMeeting, removeExternalMeetingParticipant } from "@/actions/portal.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";

type Option = { id: string; label: string };

export type ExternalParticipantRow = {
  id: string;
  contactId: string;
  contactName: string;
  rsvp: "EN_ATTENTE" | "CONFIRME" | "DECLINE";
};

const RSVP_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRME: "Confirmé",
  DECLINE: "Décliné",
};

/** Invitation d'un contact externe à une réunion (cahier des charges §17, participation réelle avec RSVP). */
export function MeetingExternalParticipantsSection({
  meetingId,
  participants,
  contacts,
}: {
  meetingId: string;
  participants: ExternalParticipantRow[];
  contacts: Option[];
}) {
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const { run: invite, isPending: inviting } = useAction(inviteContactToMeeting, {
    successMessage: "Invitation envoyée.",
  });
  const { run: remove } = useAction(removeExternalMeetingParticipant, { successMessage: "Participant retiré." });

  const invitedContactIds = new Set(participants.map((p) => p.contactId));
  const availableContacts = contacts.filter((c) => !invitedContactIds.has(c.id));

  async function handleInvite() {
    if (!selectedContactId) return;
    const result = await invite({ meetingId, contactId: selectedContactId });
    if (result.ok) setSelectedContactId("");
  }

  return (
    <div className="space-y-3">
      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun participant externe invité.</p>
      ) : (
        <ul className="space-y-1">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{p.contactName}</span>
              <div className="flex items-center gap-2">
                <Badge variant={p.rsvp === "CONFIRME" ? "success" : p.rsvp === "DECLINE" ? "destructive" : "warning"}>
                  {RSVP_LABELS[p.rsvp]}
                </Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(p.id)} aria-label="Retirer">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {availableContacts.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedContactId} onValueChange={setSelectedContactId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choisir un contact externe" />
            </SelectTrigger>
            <SelectContent>
              {availableContacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleInvite} disabled={inviting || !selectedContactId}>
            <UserPlus className="mr-1 h-4 w-4" />
            Inviter
          </Button>
        </div>
      )}
    </div>
  );
}
