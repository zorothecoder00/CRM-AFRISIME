import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeBaseline, computeScenarioImpact } from "@/lib/scenario-simulation";
import { buildExecutiveSnapshot } from "@/lib/executive-command-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioComparisonTable, type ScenarioColumn } from "@/components/scenarios/scenario-comparison-table";
import { ScenarioMultiSelect } from "@/components/scenarios/scenario-multi-select";
import { Gauge } from "lucide-react";

// Executive Simulation Room (cahier des charges V3.0 §36) — "fonctionnalité
// premium", réservée à la Direction (PERMISSIONS.EXECUTIVE_VIEW, même garde
// que le Strategic Command Center §35). Réutilise intégralement le moteur
// de simulation de scénarios (§7/§14-15 v2.2, computeScenarioImpact) : ce
// qui change n'est pas le calcul mais l'accès (exécutif seulement) et le
// cadrage ("Situation actuelle" présentée comme un instantané exécutif,
// pas juste un tableau de métriques).
export default async function SalleDeSimulationPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.EXECUTIVE_VIEW)) {
    redirect("/dashboard");
  }

  const { ids } = await searchParams;
  const selectedIds = ids ? (Array.isArray(ids) ? ids : [ids]) : [];

  const [scenarios, snap] = await Promise.all([
    prisma.scenario.findMany({ orderBy: { createdAt: "desc" } }),
    buildExecutiveSnapshot(),
  ]);
  const selected = scenarios.filter((s) => selectedIds.includes(s.id));

  let baseline = null;
  let columns: ScenarioColumn[] = [];
  let scopesDiffer = false;

  if (selected.length > 0) {
    const distinctScopes = new Set(selected.map((s) => s.departmentId ?? "org"));
    scopesDiffer = distinctScopes.size > 1;
    const sharedScope = scopesDiffer ? undefined : selected[0].departmentId;

    baseline = await computeBaseline(sharedScope);
    columns = await Promise.all(
      selected.map(async (s) => {
        const scopedBaseline = scopesDiffer ? await computeBaseline(s.departmentId) : baseline!;
        return { label: s.nom, impact: await computeScenarioImpact(s, scopedBaseline) };
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Executive Simulation Room</h1>
        <p className="text-sm text-muted-foreground">
          Espace de simulation réservé à la Direction — situation actuelle, puis test de plusieurs scénarios avec
          comparaison automatique.
        </p>
      </div>

      <Card accent="info">
        <CardHeader className="flex flex-row items-center gap-2">
          <Gauge className="size-5 text-info" />
          <CardTitle className="text-base">Situation actuelle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Avancement moyen : {snap.performanceGlobale.avancementMoyen ?? "—"}%</p>
          <p>Objectifs atteints : {snap.objectifs.atteints}/{snap.objectifs.total}</p>
          <p>Risques critiques : {snap.risquesCritiques.length}</p>
        </CardContent>
      </Card>

      <ScenarioMultiSelect
        scenarios={scenarios.map((s) => ({ id: s.id, nom: s.nom, type: s.type }))}
        initialSelectedIds={selectedIds}
        targetHref="/salle-de-simulation"
      />

      {baseline && columns.length > 0 && (
        <div className="space-y-2">
          {scopesDiffer && (
            <p className="text-xs text-muted-foreground">
              Les scénarios sélectionnés portent sur des périmètres différents — la colonne « Situation actuelle »
              utilise le périmètre organisation entière comme référence commune.
            </p>
          )}
          <ScenarioComparisonTable baseline={baseline} columns={columns} />
        </div>
      )}
    </div>
  );
}
