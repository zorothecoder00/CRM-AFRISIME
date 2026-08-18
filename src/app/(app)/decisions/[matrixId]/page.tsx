import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { computeDecisionRecommendation } from "@/lib/decision-matrix";
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
          <CardContent>
            <p className="text-sm text-muted-foreground">Score global : {recommended.score}/100</p>
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
                  <p>Coût : {o.cout ? Number(o.cout).toLocaleString("fr-FR") : "—"}</p>
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
