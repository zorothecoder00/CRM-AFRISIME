import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeBaseline, computeScenarioImpact } from "@/lib/scenario-simulation";
import { ScenarioComparisonTable } from "@/components/scenarios/scenario-comparison-table";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  EFFECTIF: "Variation d'effectifs",
  RESSOURCES: "Variation de ressources",
  PROJETS: "Variation de projets",
  NOUVELLE_FILIALE: "Nouvelle filiale",
  PERSONNALISE: "Personnalisé",
};

/** V2.2 §14 — détail d'un scénario : impact projeté vs situation actuelle. */
export default async function ScenarioDetailPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { department: { select: { name: true } } },
  });
  if (!scenario) notFound();

  const baseline = await computeBaseline(scenario.departmentId);
  const impact = await computeScenarioImpact(scenario, baseline);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{scenario.nom}</h1>
          <Badge variant="outline">{TYPE_LABELS[scenario.type] ?? scenario.type}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Portée : {scenario.department?.name ?? "Organisation entière"}
          {scenario.description ? ` — ${scenario.description}` : ""}
        </p>
      </div>

      <ScenarioComparisonTable baseline={baseline} columns={[{ label: scenario.nom, impact }]} />
    </div>
  );
}
