"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { createProgrammeRisk, updateProgrammeRiskStatus, deleteProgrammeRisk } from "@/actions/programme.actions";
import { createProgrammeRiskSchema, type CreateProgrammeRiskInput } from "@/lib/validations/programme.schema";
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

export type ProgrammeRiskRow = {
  id: string;
  titre: string;
  description: string | null;
  probabilite: string;
  impact: string;
  statut: string;
  planMitigation: string | null;
  responsableName: string | null;
};

const PROBABILITE_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYENNE: "Moyenne", ELEVEE: "Élevée" };
const IMPACT_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
  SURVENU: "Survenu",
  CLOS: "Clos",
};

/** Registre des risques au niveau programme (cahier des charges §V) — meme UI que ProjectRisksSection, actions dediees au programme. */
export function ProgrammeRisksSection({
  programmeId,
  risks,
  users,
  canManage,
}: {
  programmeId: string;
  risks: ProgrammeRiskRow[];
  users: Option[];
  canManage: boolean;
}) {
  const { run: setStatus } = useAction(updateProgrammeRiskStatus, { successMessage: "Statut mis à jour." });
  const { run: remove } = useAction(deleteProgrammeRisk, { successMessage: "Risque supprimé." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registre des risques identifiés pour ce programme, avec probabilité, impact et plan de mitigation.
        </p>
        {canManage && <RiskFormDialog programmeId={programmeId} users={users} />}
      </div>

      {risks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun risque identifié.</p>
      ) : (
        <div className="space-y-2">
          {risks.map((risk) => (
            <Card key={risk.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{risk.titre}</div>
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
                    <span className="font-medium">Mitigation :</span> {risk.planMitigation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskFormDialog({ programmeId, users }: { programmeId: string; users: Option[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProgrammeRiskInput>({
    resolver: zodResolver(createProgrammeRiskSchema),
    defaultValues: { programmeId, probabilite: "MOYENNE", impact: "MOYEN" },
  });
  const { run: submit, isPending } = useAction(createProgrammeRisk, { successMessage: "Risque ajouté." });

  async function onSubmit(data: CreateProgrammeRiskInput) {
    const result = await submit({ ...data, programmeId });
    if (result.ok) {
      reset({ programmeId, probabilite: "MOYENNE", impact: "MOYEN" });
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
            <Input id="titre" placeholder="Ex. Retard sur un projet clé du programme" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Probabilité</Label>
              <Select defaultValue="MOYENNE" onValueChange={(v) => setValue("probabilite", v as CreateProgrammeRiskInput["probabilite"])}>
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
              <Select defaultValue="MOYEN" onValueChange={(v) => setValue("impact", v as CreateProgrammeRiskInput["impact"])}>
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
            <Label htmlFor="planMitigation">Plan de mitigation</Label>
            <Textarea id="planMitigation" {...register("planMitigation")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter le risque"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
