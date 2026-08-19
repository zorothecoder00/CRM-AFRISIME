"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createComplianceObligation } from "@/actions/compliance.actions";
import { COMPLIANCE_OBLIGATION_TYPES } from "@/lib/validations/compliance.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export function ComplianceObligationFormDialog({ users }: { users: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof COMPLIANCE_OBLIGATION_TYPES)[number]>("REGLEMENTAIRE");
  const [echeance, setEcheance] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const { run, isPending } = useAction(createComplianceObligation, { successMessage: "Obligation créée." });

  async function handleSubmit() {
    if (!titre.trim()) return;
    const result = await run({
      titre: titre.trim(),
      description: description.trim() || undefined,
      type,
      echeance: echeance || undefined,
      responsableId: responsableId || undefined,
    });
    if (result.ok) {
      setOpen(false);
      setTitre("");
      setDescription("");
      setEcheance("");
      setResponsableId("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle obligation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle obligation de conformité</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_OBLIGATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Échéance</Label>
              <Input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select value={responsableId || "none"} onValueChange={(v) => setResponsableId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!titre.trim() || isPending} className="w-full">
            {isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
