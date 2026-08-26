import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeBaseline, computeScenarioImpact } from "@/lib/scenario-simulation";
import { ScenarioComparisonTable } from "@/components/scenarios/scenario-comparison-table";
import { ScenarioDeleteButton } from "@/components/scenarios/scenario-delete-button";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";

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
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.REPORT_EXPORT);

  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { department: { select: { name: true } } },
  });
  if (!scenario) notFound();

  const baseline = await computeBaseline(scenario.departmentId);
  const impact = await computeScenarioImpact(scenario, baseline);

  return (
    <div className="space-y-6">
      <BackLink href="/scenarios" label="Retour aux scénarios" />
      <div className="flex items-start justify-between gap-4">
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
        {canManage && <ScenarioDeleteButton scenarioId={scenario.id} />}
      </div>

      <ScenarioComparisonTable baseline={baseline} columns={[{ label: scenario.nom, impact }]} />
    </div>
  );
}
