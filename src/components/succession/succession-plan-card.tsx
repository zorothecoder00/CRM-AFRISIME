"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import {
  updateSuccessionPlan,
  addSuccessionCandidate,
  removeSuccessionCandidate,
  deleteSuccessionPlan,
} from "@/actions/succession.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, UserPlus } from "lucide-react";

const STATUT_LABELS: Record<string, string> = { EN_PREPARATION: "En préparation", PRET: "Prêt", ACTIF: "Actif" };
const STATUT_TONE: Record<string, "secondary" | "warning" | "success"> = {
  EN_PREPARATION: "secondary",
  PRET: "warning",
  ACTIF: "success",
};
const POTENTIEL_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const POTENTIEL_TONE: Record<string, "secondary" | "info" | "success"> = {
  FAIBLE: "secondary",
  MOYEN: "info",
  ELEVE: "success",
};

export type SuccessionPlanCardData = {
  id: string;
  statut: string;
  competencesRequises: string | null;
  notes: string | null;
  poste: { nom: string; department: { name: string } | null };
  titulaire: { id: string; name: string } | null;
  profils: { id: string; potentiel: string; pretDans: string | null; user: { id: string; name: string } }[];
};

export function SuccessionPlanCard({
  plan,
  candidateUsers,
}: {
  plan: SuccessionPlanCardData;
  candidateUsers: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  const [potentiel, setPotentiel] = useState("MOYEN");
  const [pretDans, setPretDans] = useState("");

  const updateAction = useAction(updateSuccessionPlan);
  const addCandidateAction = useAction(addSuccessionCandidate, { successMessage: "Profil de remplacement ajouté." });
  const removeCandidateAction = useAction(removeSuccessionCandidate);
  const deleteAction = useAction(deleteSuccessionPlan, { successMessage: "Plan supprimé." });

  async function handleAddCandidate() {
    if (!candidateId) return;
    const result = await addCandidateAction.run({
      successionPlanId: plan.id,
      userId: candidateId,
      potentiel: potentiel as "FAIBLE" | "MOYEN" | "ELEVE",
      pretDans: pretDans.trim() || undefined,
    });
    if (result.ok) {
      setCandidateId("");
      setPretDans("");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{plan.poste.nom}</CardTitle>
          <p className="text-xs text-muted-foreground">{plan.poste.department?.name ?? "Organisation entière"}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => deleteAction.run({ id: plan.id }).then(() => router.refresh())}
          disabled={deleteAction.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Titulaire : {plan.titulaire?.name ?? "Non renseigné"}
          </span>
        </div>

        <Select
          value={plan.statut}
          onValueChange={(v) =>
            updateAction
              .run({
                id: plan.id,
                statut: v as "EN_PREPARATION" | "PRET" | "ACTIF",
                titulaireId: plan.titulaire?.id,
                competencesRequises: plan.competencesRequises ?? undefined,
                notes: plan.notes ?? undefined,
              })
              .then(() => router.refresh())
          }
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={STATUT_TONE[plan.statut]}>{STATUT_LABELS[plan.statut]}</Badge>

        {plan.competencesRequises && (
          <p className="text-sm text-muted-foreground">Compétences requises : {plan.competencesRequises}</p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Profils de remplacement</p>
          {plan.profils.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun profil identifié.</p>
          ) : (
            plan.profils.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-sm">
                <span>
                  {c.user.name} {c.pretDans && <span className="text-xs text-muted-foreground">— prêt dans {c.pretDans}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={POTENTIEL_TONE[c.potentiel]}>{POTENTIEL_LABELS[c.potentiel]}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCandidateAction.run({ id: c.id }).then(() => router.refresh())}
                    disabled={removeCandidateAction.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-2">
          <Select value={candidateId} onValueChange={setCandidateId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Candidat" />
            </SelectTrigger>
            <SelectContent>
              {candidateUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={potentiel} onValueChange={setPotentiel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POTENTIEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Prêt dans..."
            value={pretDans}
            onChange={(e) => setPretDans(e.target.value)}
            className="w-32"
          />
          <Button size="sm" onClick={handleAddCandidate} disabled={!candidateId || addCandidateAction.isPending}>
            <UserPlus className="mr-1 h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
