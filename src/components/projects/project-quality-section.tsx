"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import { upsertQualityPlan, publishQualityPlan, createQualityControl } from "@/actions/quality.actions";
import {
  upsertQualityPlanSchema,
  createQualityControlSchema,
  type UpsertQualityPlanInput,
  type CreateQualityControlInput,
} from "@/lib/validations/quality.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export type QualityPlanData = { id: string; titre: string; contenu: string | null; statut: "BROUILLON" | "PUBLIE" | "ARCHIVE" };

export type QualityControlRow = {
  id: string;
  titre: string;
  resultat: "CONFORME" | "NON_CONFORME";
  commentaire: string | null;
  nonConformite: string | null;
  actionCorrective: string | null;
  dateControle: string;
  deliverableNom: string | null;
  responsableName: string | null;
  controleParName: string;
};

const STATUT_LABELS: Record<string, string> = { BROUILLON: "Brouillon", PUBLIE: "Publié", ARCHIVE: "Archivé" };

/** Quality Management (Project Studio §33). */
export function ProjectQualitySection({
  projectId,
  plan,
  controls,
  deliverables,
  users,
  canManage,
}: {
  projectId: string;
  plan: QualityPlanData | null;
  controls: QualityControlRow[];
  deliverables: { id: string; label: string }[];
  users: { id: string; label: string }[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <QualityPlanCard projectId={projectId} plan={plan} canManage={canManage} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Contrôles qualité</h4>
          {canManage && <QualityControlFormDialog projectId={projectId} deliverables={deliverables} users={users} />}
        </div>

        {controls.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun contrôle enregistré.</p>
        ) : (
          <div className="space-y-2">
            {controls.map((c) => (
              <Card key={c.id} size="sm">
                <CardContent className="space-y-1.5 px-(--card-spacing)">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-medium">{c.titre}</div>
                    <Badge variant={c.resultat === "CONFORME" ? "success" : "destructive"}>
                      {c.resultat === "CONFORME" ? "Conforme" : "Non conforme"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.dateControle).toLocaleDateString("fr-FR")} — contrôlé par {c.controleParName}
                    {c.deliverableNom && ` — Livrable : ${c.deliverableNom}`}
                  </p>
                  {c.commentaire && <p className="text-xs text-muted-foreground">{c.commentaire}</p>}
                  {c.nonConformite && <p className="text-xs text-destructive">Non-conformité : {c.nonConformite}</p>}
                  {c.actionCorrective && (
                    <p className="text-xs text-muted-foreground">Action corrective : {c.actionCorrective}</p>
                  )}
                  {c.responsableName && <p className="text-xs text-muted-foreground">Responsable : {c.responsableName}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QualityPlanCard({
  projectId,
  plan,
  canManage,
}: {
  projectId: string;
  plan: QualityPlanData | null;
  canManage: boolean;
}) {
  const { register, handleSubmit } = useForm<UpsertQualityPlanInput>({
    resolver: zodResolver(upsertQualityPlanSchema),
    defaultValues: { projectId, titre: plan?.titre ?? "Quality Plan", contenu: plan?.contenu ?? "" },
  });
  const { run: save, isPending } = useAction(upsertQualityPlan, { successMessage: "Quality Plan enregistré." });
  const { run: publish, isPending: publishing } = useAction(publishQualityPlan, { successMessage: "Quality Plan publié." });

  async function onSubmit(data: UpsertQualityPlanInput) {
    await save({ ...data, projectId });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Quality Plan</CardTitle>
        {plan && <Badge variant={plan.statut === "PUBLIE" ? "success" : "secondary"}>{STATUT_LABELS[plan.statut]}</Badge>}
      </CardHeader>
      <CardContent>
        {canManage ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="qp-titre">Titre</Label>
              <Input id="qp-titre" {...register("titre")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qp-contenu">
                Contenu — qualité des livrables, critères d&apos;acceptation, méthodologie de contrôle
              </Label>
              <Textarea id="qp-contenu" rows={6} {...register("contenu")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
              {plan && plan.statut !== "PUBLIE" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={publishing}
                  onClick={() => publish({ documentId: plan.id })}
                >
                  Publier
                </Button>
              )}
            </div>
          </form>
        ) : plan ? (
          <p className="whitespace-pre-wrap text-sm">{plan.contenu || "—"}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun Quality Plan défini pour ce projet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function QualityControlFormDialog({
  projectId,
  deliverables,
  users,
}: {
  projectId: string;
  deliverables: { id: string; label: string }[];
  users: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [resultat, setResultat] = useState<"CONFORME" | "NON_CONFORME">("CONFORME");
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateQualityControlInput>({
    resolver: zodResolver(createQualityControlSchema),
    defaultValues: { projectId, resultat: "CONFORME" },
  });
  const { run: submit, isPending } = useAction(createQualityControl, { successMessage: "Contrôle enregistré." });

  async function onSubmit(data: CreateQualityControlInput) {
    const result = await submit({ ...data, projectId, resultat });
    if (result.ok) {
      reset({ projectId, resultat: "CONFORME" });
      setResultat("CONFORME");
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau contrôle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer un contrôle qualité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qc-titre">Critère contrôlé</Label>
            <Input id="qc-titre" {...register("titre")} />
            {errors.titre && <p className="text-sm text-destructive">{errors.titre.message}</p>}
          </div>
          {deliverables.length > 0 && (
            <div className="space-y-2">
              <Label>Livrable (optionnel)</Label>
              <Select onValueChange={(v) => setValue("deliverableId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {deliverables.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Résultat</Label>
            <Select value={resultat} onValueChange={(v) => setResultat(v as typeof resultat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFORME">Conforme</SelectItem>
                <SelectItem value="NON_CONFORME">Non conforme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qc-commentaire">Commentaire</Label>
            <Textarea id="qc-commentaire" {...register("commentaire")} />
          </div>
          {resultat === "NON_CONFORME" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="qc-nonconformite">Non-conformité constatée</Label>
                <Textarea id="qc-nonconformite" {...register("nonConformite")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-action">Action corrective</Label>
                <Textarea id="qc-action" {...register("actionCorrective")} />
              </div>
            </>
          )}
          {users.length > 0 && (
            <div className="space-y-2">
              <Label>Responsable du suivi (optionnel)</Label>
              <Select onValueChange={(v) => setValue("responsableId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucun" />
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
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
