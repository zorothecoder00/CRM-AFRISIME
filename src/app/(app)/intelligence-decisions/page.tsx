import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisionOutcomeFormDialog } from "@/components/decisions/decision-outcome-form-dialog";
import { DecisionOutcomeEvaluateDialog } from "@/components/decisions/decision-outcome-evaluate-dialog";

// Decision Intelligence (cahier des charges V3.0 §37) — conserve
// l'historique des décisions et mesure leurs conséquences (ex. "Ouvrir une
// nouvelle agence" -> 6 mois plus tard : objectif atteint, coût réel,
// délai, performance, incidents, ROI, enseignements). L'évaluation nourrit
// aussi la mémoire organisationnelle (§17-18).
export default async function IntelligenceDecisionsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.DECISION_MATRIX_MANAGE);

  const outcomes = await prisma.decisionOutcome.findMany({ orderBy: { dateDecision: "desc" } });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Decision Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Historique des décisions et de leurs conséquences mesurées — l&apos;organisation apprend de ses propres
            décisions.
          </p>
        </div>
        {canManage && <DecisionOutcomeFormDialog />}
      </div>

      {outcomes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune décision suivie pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {outcomes.map((o) => {
            const dueForReview = !o.evaluatedAt && o.dateEvaluationPrevue !== null && o.dateEvaluationPrevue <= now;
            return (
              <Card key={o.id} accent={o.evaluatedAt ? (o.objectifAtteint ? "success" : "destructive") : dueForReview ? "warning" : "none"}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">{o.titre}</CardTitle>
                  {o.evaluatedAt ? (
                    <Badge variant={o.objectifAtteint ? "success" : "destructive"}>
                      {o.objectifAtteint ? "Objectif atteint" : "Objectif non atteint"}
                    </Badge>
                  ) : dueForReview ? (
                    <Badge variant="warning">À évaluer</Badge>
                  ) : (
                    <Badge variant="secondary">En cours</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {o.description && <p className="text-muted-foreground">{o.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    Décidé le {o.dateDecision.toLocaleDateString("fr-FR")}
                    {o.dateEvaluationPrevue && ` — évaluation prévue le ${o.dateEvaluationPrevue.toLocaleDateString("fr-FR")}`}
                  </p>
                  {o.evaluatedAt ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {o.coutReel !== null && <p>Coût réel : {Number(o.coutReel).toLocaleString("fr-FR")}</p>}
                      {o.delaiJours !== null && <p>Délai : {o.delaiJours} j</p>}
                      {o.roiPercent !== null && <p>ROI : {Number(o.roiPercent)}%</p>}
                      {o.performance && <p className="col-span-2">Performance : {o.performance}</p>}
                      {o.incidents && <p className="col-span-2">Incidents : {o.incidents}</p>}
                      {o.enseignements && <p className="col-span-2">Enseignements : {o.enseignements}</p>}
                    </div>
                  ) : (
                    canManage && <DecisionOutcomeEvaluateDialog outcomeId={o.id} />
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
