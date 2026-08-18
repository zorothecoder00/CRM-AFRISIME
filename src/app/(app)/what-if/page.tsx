import { prisma } from "@/lib/prisma";
import { WhatIfForm } from "@/components/scenarios/what-if-form";

// V3.0 §8 — What-If Engine : variables modifiables virtuellement, comparaison
// immediate Situation actuelle vs Situation simulee, sans rien persister
// (voir /scenarios pour l'equivalent enregistre, §14).
export default async function WhatIfPage() {
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">What-If Engine</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez virtuellement effectif, budget, projets, délais, capacité, agences, objectifs ou ressources, puis
          comparez la situation simulée à la situation actuelle.
        </p>
      </div>

      <WhatIfForm departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
    </div>
  );
}
