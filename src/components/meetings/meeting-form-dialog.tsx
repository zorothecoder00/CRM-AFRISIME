"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createMeeting } from "@/actions/meeting.actions";
import { createMeetingSchema, type CreateMeetingInput } from "@/lib/validations/meeting.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; label: string };

export function MeetingFormDialog({
  projects,
  users,
}: {
  projects: Option[];
  users: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: { participantIds: [] },
  });

  function toggleParticipant(userId: string, checked: boolean) {
    const next = checked
      ? [...participantIds, userId]
      : participantIds.filter((id) => id !== userId);
    setParticipantIds(next);
    setValue("participantIds", next);
  }

  async function onSubmit(data: CreateMeetingInput) {
    try {
      await createMeeting({ ...data, participantIds });
      toast.success("Réunion créée.");
      reset();
      setParticipantIds([]);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle réunion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer une réunion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <Select onValueChange={(v) => setValue("projectId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && (
              <p className="text-sm text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateHeure">Date et heure</Label>
              <Input id="dateHeure" type="datetime-local" {...register("dateHeure")} />
              {errors.dateHeure && (
                <p className="text-sm text-destructive">{errors.dateHeure.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu / lien visio</Label>
              <Input id="lieu" {...register("lieu")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordreDuJour">Ordre du jour</Label>
            <Textarea id="ordreDuJour" {...register("ordreDuJour")} />
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={participantIds.includes(u.id)}
                    onCheckedChange={(checked) => toggleParticipant(u.id, checked === true)}
                  />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Création..." : "Créer la réunion"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
