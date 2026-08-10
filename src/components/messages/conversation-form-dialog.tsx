"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export function ConversationFormDialog({ users }: { users: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [nom, setNom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(userId: string, checked: boolean) {
    setParticipantIds((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }

  async function handleSubmit() {
    if (participantIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const conversation = await createConversation({
        participantIds,
        nom: participantIds.length > 1 ? nom || undefined : undefined,
      });
      toast.success("Conversation créée.");
      setOpen(false);
      setParticipantIds([]);
      setNom("");
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle conversation
        </Button>
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
            disabled={isSubmitting || participantIds.length === 0}
          >
            {isSubmitting ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
