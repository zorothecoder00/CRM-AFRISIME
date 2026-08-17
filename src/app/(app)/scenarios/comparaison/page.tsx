import { prisma } from "@/lib/prisma";
import { computeBaseline, computeScenarioImpact } from "@/lib/scenario-simulation";
import { ScenarioComparisonTable, type ScenarioColumn } from "@/components/scenarios/scenario-comparison-table";
import { ScenarioMultiSelect } from "@/components/scenarios/scenario-multi-select";

/**
 * V2.2 §15 — Simulation organisationnelle : comparaison de plusieurs
 * scénarios (§14) côte à côte avec la situation actuelle. Même moteur
 * (computeScenarioImpact), appelé une fois par scénario sélectionné.
 */
export default async function ScenarioComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids } = await searchParams;
  const selectedIds = ids ? (Array.isArray(ids) ? ids : [ids]) : [];

  const scenarios = await prisma.scenario.findMany({ orderBy: { createdAt: "desc" } });
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
        <h1 className="text-2xl font-semibold">Comparaison de scénarios</h1>
        <p className="text-sm text-muted-foreground">
          Sélectionnez plusieurs scénarios pour comparer leur impact projeté côte à côte.
        </p>
      </div>

      <ScenarioMultiSelect
        scenarios={scenarios.map((s) => ({ id: s.id, nom: s.nom, type: s.type }))}
        initialSelectedIds={selectedIds}
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
