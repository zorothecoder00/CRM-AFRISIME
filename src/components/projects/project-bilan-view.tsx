import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { HealthScoreBreakdown, AchievementRow, PostMortemRow } from "@/lib/project-bilan";

const HEALTH_DIMENSION_LABELS: Record<string, string> = {
  planning: "Planning",
  budget: "Budget",
  qualite: "Qualité",
  risques: "Risques",
  ressources: "Ressources",
  livrables: "Livrables",
  resultats: "Résultats",
  satisfaction: "Satisfaction",
};

function toneVariant(tone: AchievementRow["tone"]) {
  return tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "danger" ? "destructive" : "outline";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

/** Bilan de projet — Health Score (§55), Évaluation finale (§51) et Post-Mortem Prévu vs Réalisé (§54). */
export function ProjectBilanView({
  healthScore,
  achievements,
  postMortem,
}: {
  healthScore: HealthScoreBreakdown;
  achievements: AchievementRow[];
  postMortem: PostMortemRow[];
}) {
  const dims = Object.entries(HEALTH_DIMENSION_LABELS) as [keyof typeof HEALTH_DIMENSION_LABELS, string][];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Project Health Score</h3>
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${scoreColor(healthScore.score)}`}>{healthScore.score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dims.map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{healthScore[key as keyof HealthScoreBreakdown]}</span>
                  </div>
                  <ProgressBar value={healthScore[key as keyof HealthScoreBreakdown] as number} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Évaluation du projet</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <Card key={a.key} size="sm">
              <CardContent className="flex items-center justify-between px-(--card-spacing)">
                <span className="text-sm">{a.label}</span>
                <Badge variant={toneVariant(a.tone)}>{a.value}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Post-Mortem — Prévu vs Réalisé</h3>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Dimension</th>
                <th className="p-2 text-left">Prévu</th>
                <th className="p-2 text-left">Réalisé</th>
              </tr>
            </thead>
            <tbody>
              {postMortem.map((row) => (
                <tr key={row.key} className="border-t">
                  <td className="p-2 font-medium">{row.label}</td>
                  <td className="p-2 text-muted-foreground">{row.prevu}</td>
                  <td className="p-2">{row.realise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
