"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProjectRisk, updateProjectRiskStatus, deleteProjectRisk } from "@/actions/project.actions";
import { createProjectRiskSchema, type CreateProjectRiskInput } from "@/lib/validations/project.schema";
import { computeRiskScore, riskScoreSeverity } from "@/lib/risk-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toneForRiskStatus, toneForNiveau } from "@/lib/status-tone";
import { Plus, Trash2 } from "lucide-react";

type Option = { id: string; label: string };

export type RiskRow = {
  id: string;
  titre: string;
  description: string | null;
  probabilite: string;
  impact: string;
  statut: string;
  categorie: string | null;
  planMitigation: string | null;
  planContingence: string | null;
  responsableName: string | null;
};

const PROBABILITE_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYENNE: "Moyenne", ELEVEE: "Élevée" };
const IMPACT_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const PROBABILITES = ["FAIBLE", "MOYENNE", "ELEVEE"];
const IMPACTS = ["FAIBLE", "MOYEN", "ELEVE"];
const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
  SURVENU: "Survenu",
  CLOS: "Clos",
};
const SEVERITY_TONE: Record<string, "success" | "warning" | "destructive"> = {
  FAIBLE: "success",
  MOYEN: "warning",
  ELEVE: "destructive",
};

/** Matrice Probabilite x Impact (Project Studio §28) — nombre de risques actifs par cellule. */
function RiskMatrix({ risks }: { risks: RiskRow[] }) {
  const active = risks.filter((r) => r.statut !== "CLOS");
  if (active.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2" />
            {IMPACTS.map((impact) => (
              <th key={impact} className="p-2 text-center font-medium text-muted-foreground">
                Impact {IMPACT_LABELS[impact]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...PROBABILITES].reverse().map((probabilite) => (
            <tr key={probabilite}>
              <th className="p-2 text-right font-medium text-muted-foreground">Probabilité {PROBABILITE_LABELS[probabilite]}</th>
              {IMPACTS.map((impact) => {
                const count = active.filter((r) => r.probabilite === probabilite && r.impact === impact).length;
                const severity = riskScoreSeverity(computeRiskScore(probabilite, impact));
                return (
                  <td key={impact} className="p-1">
                    <div
                      className={`flex h-12 w-16 items-center justify-center rounded-md text-sm font-semibold ${
                        severity === "ELEVE"
                          ? "bg-destructive/15 text-destructive"
                          : severity === "MOYEN"
                            ? "bg-warning/15 text-warning"
                            : "bg-success/15 text-success"
                      }`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectRisksSection({
  projectId,
  risks,
  users,
  canManage,
}: {
  projectId: string;
  risks: RiskRow[];
  users: Option[];
  canManage: boolean;
}) {
  const { run: setStatus } = useAction(updateProjectRiskStatus, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteProjectRisk, { successMessage: "Risque supprimé." });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registre des risques identifiés pour ce projet, avec probabilité, impact et plan de mitigation.
        </p>
        {canManage && <RiskFormDialog projectId={projectId} users={users} />}
      </div>

      <RiskMatrix risks={risks} />

      {risks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun risque identifié.</p>
      ) : (
        <div className="space-y-2">
          {risks.map((risk) => {
            const score = computeRiskScore(risk.probabilite, risk.impact);
            const severity = riskScoreSeverity(score);
            return (
              <Card key={risk.id} size="sm">
                <CardContent className="space-y-2 px-(--card-spacing)">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{risk.titre}</div>
                      {risk.categorie && <p className="text-xs text-muted-foreground">Catégorie : {risk.categorie}</p>}
                      {risk.description && (
                        <p className="text-sm text-muted-foreground">{risk.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon-sm" onClick={() => remove({ riskId: risk.id })} aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={toneForNiveau(risk.probabilite)}>Probabilité : {PROBABILITE_LABELS[risk.probabilite]}</Badge>
                    <Badge variant={toneForNiveau(risk.impact)}>Impact : {IMPACT_LABELS[risk.impact]}</Badge>
                    <Badge variant={SEVERITY_TONE[severity]}>Score : {score}/9</Badge>
                    {risk.responsableName && (
                      <span className="text-muted-foreground">Responsable : {risk.responsableName}</span>
                    )}
                    {canManage ? (
                      <Select value={risk.statut} onValueChange={(v) => setStatus({ riskId: risk.id, statut: v as never })}>
                        <SelectTrigger className="h-7 w-auto text-xs">
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
                    ) : (
                      <Badge variant={toneForRiskStatus(risk.statut)}>{STATUT_LABELS[risk.statut]}</Badge>
                    )}
                  </div>
                  {risk.planMitigation && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Mesure préventive :</span> {risk.planMitigation}
                    </p>
                  )}
                  {risk.planContingence && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Plan de contingence :</span> {risk.planContingence}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiskFormDialog({ projectId, users }: { projectId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectRiskInput>({
    resolver: zodResolver(createProjectRiskSchema),
    defaultValues: { projectId, probabilite: "MOYENNE", impact: "MOYEN" },
  });
  const { run: submit, isPending } = useAction(createProjectRisk, { successMessage: "Risque ajouté." });

  async function onSubmit(data: CreateProjectRiskInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId, probabilite: "MOYENNE", impact: "MOYEN" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau risque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Identifier un risque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" placeholder="Ex. Retard de livraison fournisseur" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie</Label>
            <Input id="categorie" placeholder="Ex. Financier, opérationnel, sécurité..." {...register("categorie")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Probabilité</Label>
              <Select defaultValue="MOYENNE" onValueChange={(v) => setValue("probabilite", v as CreateProjectRiskInput["probabilite"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROBABILITE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impact</Label>
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("impact", v as CreateProjectRiskInput["impact"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select onValueChange={(v) => setValue("responsableId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planMitigation">Mesure préventive</Label>
            <Textarea id="planMitigation" {...register("planMitigation")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planContingence">Plan de contingence (si le risque survient)</Label>
            <Textarea id="planContingence" {...register("planContingence")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le risque"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
