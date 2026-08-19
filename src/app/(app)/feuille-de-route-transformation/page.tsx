import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { computeTransformationRoadmap, type RoadmapInitiative } from "@/lib/transformation-roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function InitiativeCard({ initiative }: { initiative: RoadmapInitiative }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{initiative.titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs text-muted-foreground">
        <p>{initiative.description}</p>
        <p>
          <span className="font-medium text-foreground">Projets suggérés :</span> {initiative.projetsSuggeres.join(", ")}
        </p>
        <p>
          <span className="font-medium text-foreground">Ressources :</span> {initiative.ressources}
        </p>
        <p>
          <span className="font-medium text-foreground">KPI :</span> {initiative.kpi}
        </p>
        {initiative.risques.length > 0 && (
          <p>
            <span className="font-medium text-foreground">Risques :</span> {initiative.risques.join(" ")}
          </p>
        )}
        <Badge variant="outline">Échéance : {initiative.echeance.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</Badge>
      </CardContent>
    </Card>
  );
}

// AI-Generated Transformation Roadmap (cahier des charges V3.0 §34) —
// proposée à partir du diagnostic de maturité (§33) : priorités immédiates
// (12 mois), transformations intermédiaires (24 mois), objectifs avancés
// (36 mois). Voir src/lib/transformation-roadmap.ts pour la génération
// heuristique (pas de vrai LLM disponible dans cette instance).
export default async function FeuilleDeRouteTransformationPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const roadmap = await computeTransformationRoadmap();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feuille de route de transformation</h1>
        <p className="text-sm text-muted-foreground">
          Proposition générée à partir du diagnostic de maturité organisationnelle — priorités immédiates,
          transformations intermédiaires et objectifs avancés.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">12 mois — Priorités immédiates</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmap.horizon12Mois.map((i, idx) => (
            <InitiativeCard key={idx} initiative={i} />
          ))}
          {roadmap.horizon12Mois.length === 0 && <p className="text-sm text-muted-foreground">Rien à prioriser dans l&apos;immédiat.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">24 mois — Transformations intermédiaires</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmap.horizon24Mois.map((i, idx) => (
            <InitiativeCard key={idx} initiative={i} />
          ))}
          {roadmap.horizon24Mois.length === 0 && <p className="text-sm text-muted-foreground">Aucune transformation intermédiaire identifiée.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">36 mois — Objectifs avancés</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmap.horizon36Mois.map((i, idx) => (
            <InitiativeCard key={idx} initiative={i} />
          ))}
          {roadmap.horizon36Mois.length === 0 && <p className="text-sm text-muted-foreground">Aucun objectif avancé identifié.</p>}
        </div>
      </div>
    </div>
  );
}
