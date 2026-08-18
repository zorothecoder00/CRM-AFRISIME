import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { computeOrganizationalHealth } from "@/lib/health-score";
import { HealthScoreWeightRow } from "@/components/administration/health-score-weight-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";

function toneForScore(score: number): "success" | "warning" | "destructive" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "destructive";
}

// Organizational Health Score (cahier des charges V3.0 §13) — score
// synthétique 0-100, moyenne pondérée de 9 dimensions actives (TURNOVER
// exclu par défaut, aucune donnée pertinente disponible dans ce MVP) —
// voir src/lib/health-score.ts. "Configurable" via les poids ci-dessous,
// "explicable" via le détail par dimension.
export default async function OrganizationalHealthPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }
  const canConfigure = session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ACCESS);

  const health = await computeOrganizationalHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Santé organisationnelle</h1>
        <p className="text-sm text-muted-foreground">
          Indicateur synthétique calculé à partir de la performance, la charge, les risques, les projets, les
          processus, la qualité, la gouvernance, la satisfaction et le respect des échéances.
        </p>
      </div>

      <Card accent={toneForScore(health.score)}>
        <CardHeader>
          <CardTitle className="text-base">Organizational Health Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{health.score}</span>
            <span className="text-muted-foreground">/100</span>
          </div>
          <ProgressBar value={health.score} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par dimension</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {health.dimensions.map((d) => (
            <div key={d.dimension} className="space-y-1 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{d.label}</span>
                <div className="flex items-center gap-2">
                  {!d.isActive && <Badge variant="secondary">Exclue du calcul</Badge>}
                  <Badge variant={d.score === null ? "secondary" : toneForScore(d.score)}>
                    {d.score === null ? "Non disponible" : `${d.score}/100`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">poids {d.poids}</span>
                </div>
              </div>
              {d.score !== null && <ProgressBar value={d.score} />}
              <p className="text-xs text-muted-foreground">{d.explication}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {canConfigure && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration des poids</CardTitle>
            <p className="text-xs text-muted-foreground">
              Poids relatif de chaque dimension dans la moyenne pondérée — une dimension désactivée est exclue du
              calcul (elle reste affichée à titre indicatif).
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.dimensions.map((d) => (
              <HealthScoreWeightRow
                key={d.dimension}
                dimension={d.dimension}
                label={d.label}
                initialPoids={d.poids}
                initialActive={d.isActive}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
