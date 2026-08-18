import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computeProjectPrediction,
  computeObjectivePrediction,
  computeTeamPrediction,
  computeOpportunityPrediction,
} from "@/lib/predictive-scoring";
import { detectEmergentRisk } from "@/lib/early-warning";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { AlertTriangle, ShieldAlert } from "lucide-react";

const TOP_N = 10;

function toneForRisk(score: number): "destructive" | "secondary" | "outline" {
  if (score >= 60) return "destructive";
  if (score >= 30) return "secondary";
  return "outline";
}

/**
 * V2.2 §11 — Intelligence Prédictive. Estimations heuristiques (régression
 * linéaire sur MetricSnapshot + facteurs instantanés), pas un modèle
 * entraîné — voir src/lib/predictive-scoring.ts. Recalculé à chaque visite,
 * pas mis en cache : le volume de projets/objectifs/équipes/opportunités
 * actifs reste modeste dans cette app.
 */
export default async function PredictionsPage() {
  const [projects, objectives, teams, opportunities, earlyWarning] = await Promise.all([
    prisma.project.findMany({ where: { statut: "EN_COURS" }, select: { id: true, nom: true } }),
    prisma.objective.findMany({ where: { statut: "EN_COURS" }, select: { id: true, titre: true } }),
    prisma.team.findMany({ select: { id: true, nom: true, members: { select: { userId: true } } } }),
    prisma.crmOpportunity.findMany({
      where: { statut: { notIn: ["GAGNEE", "PERDUE"] } },
      select: { id: true, nom: true },
    }),
    detectEmergentRisk(),
  ]);

  const [projectScores, objectiveScores, teamScores, opportunityScores] = await Promise.all([
    Promise.all(projects.map(async (p) => ({ id: p.id, label: p.nom, ...(await computeProjectPrediction(p.id)) }))),
    Promise.all(objectives.map(async (o) => ({ id: o.id, label: o.titre, ...(await computeObjectivePrediction(o.id)) }))),
    Promise.all(
      teams.map(async (t) => ({
        id: t.id,
        label: t.nom,
        ...(await computeTeamPrediction(t.members.map((m) => m.userId))),
      }))
    ),
    Promise.all(
      opportunities.map(async (o) => ({ id: o.id, label: o.nom, ...(await computeOpportunityPrediction(o.id)) }))
    ),
  ]);

  const topProjects = [...projectScores].sort((a, b) => b.risqueEchec - a.risqueEchec).slice(0, TOP_N);
  const topObjectives = [...objectiveScores].sort((a, b) => a.probabiliteAtteinte - b.probabiliteAtteinte).slice(0, TOP_N);
  const topTeams = [...teamScores].sort((a, b) => b.risqueSurcharge - a.risqueSurcharge).slice(0, TOP_N);
  const topOpportunities = [...opportunityScores].sort((a, b) => b.risquePerte - a.risquePerte).slice(0, TOP_N);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Intelligence prédictive</h1>
        <p className="text-sm text-muted-foreground">
          Estimation heuristique à partir des données actuelles (retards, tendances, charge, historique
          d&apos;interactions) — pas un modèle prédictif entraîné.
        </p>
      </div>

      <Card accent={earlyWarning.risqueEmergent ? "destructive" : "none"}>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShieldAlert className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Signaux faibles (Early Warning System)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {earlyWarning.risqueEmergent && (
            <p className="text-sm font-medium text-destructive">
              ⚠️ Risque organisationnel émergent détecté — {earlyWarning.signauxActifs} signaux combinés.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {earlyWarning.signaux.map((s) => (
              <Badge key={s.cle} variant={s.actif ? "destructive" : "outline"} title={s.detail}>
                {s.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Individuellement, aucun de ces signaux n&apos;est nécessairement critique — combinés (3 ou plus), ils
            signalent un risque émergent à analyser.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projets — risque d&apos;échec</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProjects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet actif.</p>}
            {topProjects.map((p) => (
              <Link key={p.id} href={`/projets/${p.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  <Badge variant={toneForRisk(p.risqueEchec)}>{p.risqueEchec}%</Badge>
                </div>
                <ProgressBar value={p.risqueEchec} className="mt-2" />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Retard : {p.probabiliteRetard}%</span>
                  <span>Dépassement : {p.probabiliteDepassement}%</span>
                </div>
                {p.facteurs.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {p.facteurs.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objectifs — probabilité d&apos;atteinte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topObjectives.length === 0 && <p className="text-sm text-muted-foreground">Aucun objectif en cours.</p>}
            {topObjectives.map((o) => (
              <Link key={o.id} href={`/objectifs/${o.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.label}</span>
                  <Badge variant={toneForRisk(100 - o.probabiliteAtteinte)}>{o.probabiliteAtteinte}%</Badge>
                </div>
                <ProgressBar value={o.probabiliteAtteinte} className="mt-2" />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Tendance : {o.tendance}</span>
                  <span>Écart prévisionnel : {o.ecartPrevisionnel}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Équipes — risque de surcharge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTeams.length === 0 && <p className="text-sm text-muted-foreground">Aucune équipe.</p>}
            {topTeams.map((t) => (
              <Link key={t.id} href={`/pilotage/equipe/${t.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.label}</span>
                  <Badge variant={toneForRisk(t.risqueSurcharge)}>{t.risqueSurcharge}%</Badge>
                </div>
                <ProgressBar value={t.risqueSurcharge} className="mt-2" />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {t.baisseProductivite && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" /> Productivité en baisse
                      {t.variationProductivitePercent !== null ? ` (${t.variationProductivitePercent}%)` : ""}
                    </span>
                  )}
                </div>
                {t.besoinsCompetences.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {t.besoinsCompetences.slice(0, 3).map((b) => (
                      <li key={b.competenceId}>
                        • Besoin en {b.competenceNom} : {b.demande} demande(s) pour {b.disponible} disponible(s)
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CRM — risque de perte d&apos;opportunité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topOpportunities.length === 0 && <p className="text-sm text-muted-foreground">Aucune opportunité active.</p>}
            {topOpportunities.map((o) => (
              <Link
                key={o.id}
                href={`/crm/opportunites/${o.id}`}
                className="block rounded-md border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.label}</span>
                  <Badge variant={toneForRisk(o.risquePerte)}>{o.risquePerte}%</Badge>
                </div>
                <ProgressBar value={o.risquePerte} className="mt-2" />
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Conversion : {o.probabiliteConversion}%</span>
                  <span>Relance efficace : {o.probabiliteRelanceEfficace}%</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
