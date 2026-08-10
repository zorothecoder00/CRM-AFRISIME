"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateCapacity } from "@/actions/workload.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export function CapacityFormDialog({
  userId,
  currentCapacity,
}: {
  userId: string;
  currentCapacity: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentCapacity));
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      await updateCapacity({ userId, capaciteHebdomadaireHeures: value });
      toast.success("Capacité mise à jour.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capacité hebdomadaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="number"
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
