import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildOrganizationalGraph } from "@/lib/organizational-graph";
import { departmentLevelLabel, computeDepartmentDepth, type DepartmentNode } from "@/lib/department-tree";
import { OrganizationalGraphView } from "@/components/organizational-graph/organizational-graph-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Graphe organisationnel (cahier des charges V3.0 §5) — page dediee,
// distincte du Graphe de connaissances (§27, /graphe-de-connaissances) et
// du Jumeau organisationnel (§4, tableau de bord de synthese sans
// navigation). Racine = un Department (Direction/Departement/Service selon
// la profondeur, cf. departmentLevelLabel) ; voir
// src/lib/organizational-graph.ts pour la chaine Direction -> Equipe ->
// Prestataire -> Projet -> Objectif.
export default async function OrganizationalGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ rootId?: string }>;
}) {
  const sp = await searchParams;

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });
  const departmentById = new Map<string, DepartmentNode>(departments.map((d) => [d.id, d]));

  const candidates = departments.map((d) => ({
    id: d.id,
    label: `${d.name} (${departmentLevelLabel(computeDepartmentDepth(d.id, departmentById))})`,
  }));
  const rootId = sp.rootId && candidates.some((c) => c.id === sp.rootId) ? sp.rootId : candidates[0]?.id;

  const graph = rootId ? await buildOrganizationalGraph(rootId) : { nodes: [], edges: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Graphe organisationnel</h1>
        <p className="text-sm text-muted-foreground">
          Direction → dépend de → Équipe → dépend de → Prestataire → intervient sur → Projet → contribue à →
          Objectif.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Racine</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] space-y-1 overflow-y-auto">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/graphe-organisationnel?rootId=${c.id}`}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                  c.id === rootId && "bg-muted font-medium"
                )}
              >
                {c.label}
              </Link>
            ))}
            {candidates.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée.</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <OrganizationalGraphView nodes={graph.nodes} edges={graph.edges} />
        </div>
      </div>
    </div>
  );
}
