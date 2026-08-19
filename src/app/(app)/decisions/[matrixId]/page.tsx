import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeDecisionRecommendation, buildDecisionJustification } from "@/lib/decision-matrix";
import { getDependenciesFor, resolveDependencyLabels } from "@/lib/dependencies";
import { getOrganizationDevise } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionOptionFormDialog } from "@/components/decisions/decision-option-form-dialog";
import { DecisionWeightsForm } from "@/components/decisions/decision-weights-form";
import { DeleteOptionButton } from "@/components/decisions/delete-option-button";
import { Trophy } from "lucide-react";

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

export default async function DecisionMatrixDetailPage({
  params,
}: {
  params: Promise<{ matrixId: string }>;
}) {
  const { matrixId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.DECISION_MATRIX_MANAGE);

  const matrix = await prisma.decisionMatrix.findUnique({
    where: { id: matrixId },
    include: { options: { orderBy: { createdAt: "asc" } }, project: { select: { nom: true } }, createdBy: { select: { name: true } } },
  });

  if (!matrix) {
    notFound();
  }

  const devise = await getOrganizationDevise();

  const recommendations = computeDecisionRecommendation(
    matrix.options.map((o) => ({
      id: o.id,
      nom: o.nom,
      cout: o.cout ? Number(o.cout) : null,
      delaiJours: o.delaiJours,
      risque: o.risque,
      impact: o.impact,
      ressources: o.ressources ? Number(o.ressources) : null,
      roiPercent: o.roiPercent ? Number(o.roiPercent) : null,
      faisabilite: o.faisabilite,
    })),
    {
      poidsCout: matrix.poidsCout,
      poidsDelai: matrix.poidsDelai,
      poidsRisque: matrix.poidsRisque,
      poidsImpact: matrix.poidsImpact,
      poidsRessources: matrix.poidsRessources,
      poidsRoi: matrix.poidsRoi,
      poidsFaisabilite: matrix.poidsFaisabilite,
    }
  );
  const recommended = recommendations[0];
  const justification = buildDecisionJustification(recommendations);

  const projectDependencies = matrix.projectId ? await getDependenciesFor("Project", matrix.projectId) : null;
  const dependencyLabels = projectDependencies
    ? await resolveDependencyLabels([
        ...projectDependencies.upstream.map((d) => ({ type: d.targetType, id: d.targetId })),
        ...projectDependencies.downstream.map((d) => ({ type: d.sourceType, id: d.sourceId })),
      ])
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{matrix.titre}</h1>
        {matrix.contexte && <p className="mt-1 text-sm text-muted-foreground">{matrix.contexte}</p>}
        {matrix.project && <p className="text-xs text-muted-foreground">Projet : {matrix.project.nom}</p>}
      </div>

      {recommended && (
        <Card accent="success">
          <CardHeader className="flex flex-row items-center gap-2">
            <Trophy className="size-5 text-success" />
            <CardTitle className="text-base">Recommandation : {recommended.nom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Score global : {recommended.score}/100</p>
            {justification && <p className="text-sm">{justification}</p>}
          </CardContent>
        </Card>
      )}

      {projectDependencies && dependencyLabels && (projectDependencies.upstream.length > 0 || projectDependencies.downstream.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépendances du projet concerné</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {projectDependencies.upstream.map((d) => (
              <p key={d.id}>Dépend de : {dependencyLabels.get(`${d.targetType}:${d.targetId}`) ?? d.targetId}</p>
            ))}
            {projectDependencies.downstream.map((d) => (
              <p key={d.id}>Dont dépend : {dependencyLabels.get(`${d.sourceType}:${d.sourceId}`) ?? d.sourceId}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pondération des critères (0-100)</CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionWeightsForm
              matrixId={matrix.id}
              initial={{
                poidsCout: matrix.poidsCout,
                poidsDelai: matrix.poidsDelai,
                poidsRisque: matrix.poidsRisque,
                poidsImpact: matrix.poidsImpact,
                poidsRessources: matrix.poidsRessources,
                poidsRoi: matrix.poidsRoi,
                poidsFaisabilite: matrix.poidsFaisabilite,
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Options ({matrix.options.length})</h2>
        {canManage && <DecisionOptionFormDialog matrixId={matrix.id} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {matrix.options.map((o) => {
          const rec = recommendations.find((r) => r.optionId === o.id);
          const isTop = recommended?.optionId === o.id;
          return (
            <Card key={o.id} accent={isTop ? "success" : "none"}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {o.nom} {isTop && <Badge variant="success">Recommandée</Badge>}
                </CardTitle>
                {canManage && <DeleteOptionButton optionId={o.id} matrixId={matrix.id} />}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.description && <p className="text-muted-foreground">{o.description}</p>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <p>Coût : {o.cout ? `${Number(o.cout).toLocaleString("fr-FR")} ${devise}` : "—"}</p>
                  <p>Délai : {o.delaiJours ?? "—"} j</p>
                  <p>Ressources : {o.ressources ? Number(o.ressources) : "—"}</p>
                  <p>ROI : {o.roiPercent ? `${Number(o.roiPercent)}%` : "—"}</p>
                  <p>Risque : {NIVEAU_LABELS[o.risque]}</p>
                  <p>Impact : {NIVEAU_LABELS[o.impact]}</p>
                  <p>Faisabilité : {NIVEAU_LABELS[o.faisabilite]}</p>
                </div>
                {rec && (
                  <Badge variant="outline">Score : {rec.score}/100</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
        {matrix.options.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune option pour le moment.</p>
        )}
      </div>
    </div>
  );
}
