import { computeSkillsIntelligence } from "@/lib/skills-intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RECO_LABELS: Record<string, string> = {
  FORMATION: "Formation",
  RECRUTEMENT: "Recrutement",
  MOBILITE_INTERNE: "Mobilité interne",
  SOUS_TRAITANCE: "Sous-traitance",
  REALLOCATION: "Réallocation",
  AUCUNE: "Aucune action",
};

const RECO_TONE: Record<string, "warning" | "destructive" | "info" | "secondary" | "success"> = {
  FORMATION: "info",
  RECRUTEMENT: "destructive",
  MOBILITE_INTERNE: "warning",
  SOUS_TRAITANCE: "secondary",
  REALLOCATION: "secondary",
  AUCUNE: "success",
};

// Skills Intelligence (cahier des charges V3.0 §23) — compétences
// disponibles vs nécessaires vs futures, puis proposition d'action par
// écart (formation, recrutement, mobilité interne, sous-traitance,
// réallocation).
export default async function IntelligenceCompetencesPage() {
  const gaps = await computeSkillsIntelligence();
  const withGap = gaps.filter((g) => g.ecart > 0);
  const withoutGap = gaps.filter((g) => g.ecart === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Skills Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Compétences disponibles vs nécessaires vs futures — puis une action proposée par écart : formation,
          recrutement, mobilité interne, sous-traitance ou réallocation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Écarts identifiés ({withGap.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {withGap.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun écart de compétence détecté.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Compétence</th>
                    <th className="py-2">Disponible</th>
                    <th className="py-2">Nécessaire</th>
                    <th className="py-2">Future</th>
                    <th className="py-2">Écart</th>
                    <th className="py-2">Recommandation</th>
                  </tr>
                </thead>
                <tbody>
                  {withGap.map((g) => (
                    <tr key={g.competence} className="border-b last:border-0">
                      <td className="py-2 font-medium">{g.competence}</td>
                      <td className="py-2">
                        {g.disponible} ({g.utilisateursDisponibles} pers.)
                      </td>
                      <td className="py-2">{g.necessaire}</td>
                      <td className="py-2">{g.future}</td>
                      <td className="py-2 font-semibold">{g.ecart}</td>
                      <td className="py-2">
                        <Badge variant={RECO_TONE[g.recommandation]}>{RECO_LABELS[g.recommandation]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {withoutGap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compétences couvertes ({withoutGap.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {withoutGap.map((g) => (
              <Badge key={g.competence} variant="success">
                {g.competence}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
