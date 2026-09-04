"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
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
  const { run: submit, isPending } = useAction(updateCapacity, { successMessage: "Capacité mise à jour." });

  async function handleSubmit() {
    const result = await submit({ userId, capaciteHebdomadaireHeures: value });
    if (result.ok) setOpen(false);
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
            min={0}
            max={168}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
