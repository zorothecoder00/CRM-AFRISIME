import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForEvaluationStatus, accentForEvaluationStatus, toneForStatus } from "@/lib/status-tone";
import { EditEvaluationDialog } from "@/components/evaluations/edit-evaluation-dialog";
import { AddCritereDialog } from "@/components/evaluations/add-critere-dialog";
import { CritereList } from "@/components/evaluations/critere-list";
import { SubmitEvaluationButton } from "@/components/evaluations/submit-evaluation-button";
import { AcknowledgeEvaluationForm } from "@/components/evaluations/acknowledge-evaluation-form";

const PERIODE_LABELS: Record<string, string> = {
  ANNUELLE: "Annuelle",
  SEMESTRIELLE: "Semestrielle",
  TRIMESTRIELLE: "Trimestrielle",
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMISE: "Soumise",
  ACCUSE_RECEPTION: "Accusée réception",
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ATTEINT: "Atteint",
  NON_ATTEINT: "Non atteint",
  ANNULE: "Annulé",
};

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const { evaluationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.EVALUATION_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.EVALUATION_MANAGE);
  const userId = session!.user.id;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      evalue: true,
      evaluateur: true,
      department: true,
      criteres: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!evaluation) {
    notFound();
  }

  if (!canManage && evaluation.evalueId !== userId) {
    redirect("/evaluations");
  }

  const isEvaluateur = evaluation.evaluateurId === userId;
  const isEvalue = evaluation.evalueId === userId;

  const objectives = await prisma.objective.findMany({
    where: {
      userId: evaluation.evalueId,
      dateDebut: { lte: evaluation.dateFin },
      dateFin: { gte: evaluation.dateDebut },
    },
    orderBy: { dateDebut: "desc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{evaluation.evalue.name}</h1>
            <Badge variant="outline">{PERIODE_LABELS[evaluation.periode]}</Badge>
            <Badge variant={toneForEvaluationStatus(evaluation.statut)}>
              {STATUS_LABELS[evaluation.statut]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Évaluée par {evaluation.evaluateur.name}
            {evaluation.department && ` — ${evaluation.department.name}`}
          </p>
        </div>

        <Card accent={accentForEvaluationStatus(evaluation.statut)}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Informations générales</CardTitle>
            {canManage && isEvaluateur && evaluation.statut === "BROUILLON" && (
              <EditEvaluationDialog
                evaluation={{
                  id: evaluation.id,
                  dateDebut: evaluation.dateDebut.toISOString().slice(0, 10),
                  dateFin: evaluation.dateFin.toISOString().slice(0, 10),
                  pointsForts: evaluation.pointsForts,
                  axesAmelioration: evaluation.axesAmelioration,
                  commentaireEvaluateur: evaluation.commentaireEvaluateur,
                }}
              />
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Période" value={PERIODE_LABELS[evaluation.periode]} />
            <Info
              label="Score global"
              value={evaluation.scoreGlobal ? `${Number(evaluation.scoreGlobal).toFixed(2)} / 5` : "—"}
            />
            <Info label="Début" value={evaluation.dateDebut.toLocaleDateString("fr-FR")} />
            <Info label="Fin" value={evaluation.dateFin.toLocaleDateString("fr-FR")} />
            <Info
              label="Soumise le"
              value={evaluation.dateSoumission ? evaluation.dateSoumission.toLocaleDateString("fr-FR") : "—"}
            />
            <Info
              label="Accusé de réception"
              value={
                evaluation.dateAccuseReception
                  ? evaluation.dateAccuseReception.toLocaleDateString("fr-FR")
                  : "—"
              }
            />
          </CardContent>
          {evaluation.pointsForts && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Points forts</div>
              <p className="whitespace-pre-wrap text-sm">{evaluation.pointsForts}</p>
            </CardContent>
          )}
          {evaluation.axesAmelioration && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Axes d&apos;amélioration</div>
              <p className="whitespace-pre-wrap text-sm">{evaluation.axesAmelioration}</p>
            </CardContent>
          )}
          {evaluation.commentaireEvaluateur && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Commentaire de l&apos;évaluateur</div>
              <p className="whitespace-pre-wrap text-sm">{evaluation.commentaireEvaluateur}</p>
            </CardContent>
          )}
          {evaluation.commentaireEvalue && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Commentaire de l&apos;évalué</div>
              <p className="whitespace-pre-wrap text-sm">{evaluation.commentaireEvalue}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Critères notés ({evaluation.criteres.length})</CardTitle>
            {isEvaluateur && evaluation.statut === "BROUILLON" && (
              <AddCritereDialog evaluationId={evaluation.id} />
            )}
          </CardHeader>
          <CardContent>
            <CritereList
              criteres={evaluation.criteres.map((c) => ({
                id: c.id,
                libelle: c.libelle,
                note: Number(c.note),
                commentaire: c.commentaire,
              }))}
              editable={isEvaluateur && evaluation.statut === "BROUILLON"}
            />
          </CardContent>
        </Card>

        {objectives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Objectifs de la période ({objectives.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {objectives.map((objective) => (
                <div key={objective.id} className="rounded-md border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{objective.titre}</span>
                    <Badge variant={toneForStatus(objective.statut)}>
                      {OBJECTIVE_STATUS_LABELS[objective.statut]}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isEvaluateur && evaluation.statut === "BROUILLON" && (
          <SubmitEvaluationButton evaluationId={evaluation.id} />
        )}

        {isEvalue && evaluation.statut === "SOUMISE" && (
          <AcknowledgeEvaluationForm evaluationId={evaluation.id} />
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
