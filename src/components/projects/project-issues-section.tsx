"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { createIncident } from "@/actions/incident.actions";
import { INCIDENT_CRITICITES } from "@/lib/validations/incident.schema";
import { IncidentCard, type IncidentCardData } from "@/components/incidents/incident-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

/**
 * Issue Management (Project Studio §30) — un problème déjà survenu, par
 * opposition au risque (potentiel, voir ProjectRisksSection). Réutilise le
 * modèle Incident existant (déjà rattachable à un projet) plutôt que d'en
 * dupliquer un nouveau.
 */
export function ProjectIssuesSection({
  projectId,
  issues,
  users,
  canManage,
}: {
  projectId: string;
  issues: IncidentCardData[];
  users: { id: string; label: string }[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Problèmes déjà survenus sur ce projet — à ne pas confondre avec les risques (potentiels).
        </p>
        <IssueFormDialog projectId={projectId} />
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun problème signalé pour ce projet.</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <IncidentCard
              key={issue.id}
              incident={issue}
              canManage={canManage}
              escalateTargets={users}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueFormDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [criticite, setCriticite] = useState<(typeof INCIDENT_CRITICITES)[number]>("MODERE");
  const [impact, setImpact] = useState("");
  const [actionCorrective, setActionCorrective] = useState("");
  const { run: submit, isPending } = useAction(createIncident, { successMessage: "Problème signalé." });

  async function handleSubmit() {
    if (!titre.trim()) return;
    const result = await submit({
      type: "PROJET",
      titre: titre.trim(),
      description: description.trim() || undefined,
      criticite,
      projectId,
      impact: impact.trim() || undefined,
      actionCorrective: actionCorrective.trim() || undefined,
    });
    if (result.ok) {
      setTitre("");
      setDescription("");
      setImpact("");
      setActionCorrective("");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau problème
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issue-titre">Problème</Label>
            <Input id="issue-titre" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gravité</Label>
            <Select value={criticite} onValueChange={(v) => setCriticite(v as typeof criticite)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_CRITICITES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea id="issue-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-impact">Impact</Label>
            <Textarea id="issue-impact" value={impact} onChange={(e) => setImpact(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-action">Action corrective</Label>
            <Textarea id="issue-action" value={actionCorrective} onChange={(e) => setActionCorrective(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!titre.trim() || isPending} onClick={handleSubmit}>
            {isPending ? "Envoi..." : "Signaler"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
