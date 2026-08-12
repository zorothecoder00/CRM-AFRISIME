"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createConversation } from "@/actions/message.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

export function ConversationFormDialog({
  users,
  variant = "default",
}: {
  users: Option[];
  /** "icon" : bouton rond compact, pour un en-tete de barre laterale. */
  variant?: "default" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const { run: submit, isPending } = useAction(createConversation, { successMessage: "Conversation créée." });

  function toggle(userId: string, checked: boolean) {
    setParticipantIds((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  async function handleSubmit() {
    if (participantIds.length === 0) return;
    const result = await submit({
      participantIds,
      nom: participantIds.length > 1 ? nom || undefined : undefined,
    });
    if (result.ok) {
      setOpen(false);
      setParticipantIds([]);
      setNom("");
      router.push(`/messages/${result.data.id}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button size="icon" className="rounded-full" aria-label="Nouvelle conversation" title="Nouvelle conversation">
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle conversation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {participantIds.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du groupe (optionnel)</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={participantIds.includes(u.id)}
                    onCheckedChange={(checked) => toggle(u.id, checked === true)}
                  />
                  {u.label}
                </label>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isPending || participantIds.length === 0}
          >
            {isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
