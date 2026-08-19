import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { computeMaturityAssessment } from "@/lib/maturity-assessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";

function toneForScore(score: number): "success" | "warning" | "destructive" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "destructive";
}

// Digital Maturity Assessment (cahier des charges V3.0 §33) — distinct du
// Health Score (§13) : mesure le degré de développement des pratiques et
// outils organisationnels sur 10 dimensions, pas la vitalité opérationnelle
// instantanée. Voir src/lib/maturity-assessment.ts.
export default async function MaturiteOrganisationnellePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const assessment = await computeMaturityAssessment();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Digital Maturity Assessment</h1>
        <p className="text-sm text-muted-foreground">
          Maturité organisationnelle sur 10 dimensions : stratégie, gouvernance, digitalisation, processus,
          collaboration, gestion des données, performance, innovation, IA, gestion des risques.
        </p>
      </div>

      <Card accent={toneForScore(assessment.score)}>
        <CardHeader>
          <CardTitle className="text-base">Maturité organisationnelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{assessment.score}</span>
            <span className="text-muted-foreground">/100</span>
          </div>
          <ProgressBar value={assessment.score} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessment.forces.map((d) => (
              <div key={d.dimension} className="flex items-center justify-between text-sm">
                <span>{d.label}</span>
                <Badge variant={toneForScore(d.score)}>{d.score}/100</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faiblesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessment.faiblesses.map((d) => (
              <div key={d.dimension} className="flex items-center justify-between text-sm">
                <span>{d.label}</span>
                <Badge variant={toneForScore(d.score)}>{d.score}/100</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par dimension et recommandations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assessment.dimensions.map((d) => (
            <div key={d.dimension} className="space-y-1 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{d.label}</span>
                <Badge variant={toneForScore(d.score)}>{d.score}/100</Badge>
              </div>
              <ProgressBar value={d.score} />
              <p className="text-xs text-muted-foreground">{d.explication}</p>
              <p className="text-xs">
                <span className="font-medium">Recommandation :</span> {d.recommandation}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6 text-sm">
          <p className="text-muted-foreground">
            Pour une feuille de route détaillée (12/24/36 mois) construite à partir de ce diagnostic, consultez la
            roadmap de transformation.
          </p>
          <Link href="/feuille-de-route-transformation" className="shrink-0 font-medium text-primary underline">
            Voir la feuille de route →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
