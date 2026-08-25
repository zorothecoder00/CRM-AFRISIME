"use client";

import { useAction } from "@/hooks/use-action";
import { updateParticipantPresence } from "@/actions/meeting.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ParticipantRow = {
  userId: string;
  userName: string;
  present: boolean | null;
};

/** Suivi de présence (comble) — renseigné manuellement par l'organisateur, pas de détection automatique. */
export function MeetingParticipantsSection({
  meetingId,
  participants,
  canManage,
}: {
  meetingId: string;
  participants: ParticipantRow[];
  canManage: boolean;
}) {
  const { run: setPresence } = useAction(updateParticipantPresence, { successMessage: "Présence mise à jour." });

  return (
    <ul className="space-y-1.5 text-sm">
      {participants.map((p) => (
        <li key={p.userId} className="flex items-center justify-between gap-2">
          <span>{p.userName}</span>
          {canManage ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={p.present === true ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setPresence({ meetingId, userId: p.userId, present: true })}
              >
                Présent
              </Button>
              <Button
                type="button"
                variant={p.present === false ? "destructive" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setPresence({ meetingId, userId: p.userId, present: false })}
              >
                Absent
              </Button>
            </div>
          ) : (
            p.present !== null && (
              <Badge variant={p.present ? "success" : "destructive"}>{p.present ? "Présent" : "Absent"}</Badge>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
