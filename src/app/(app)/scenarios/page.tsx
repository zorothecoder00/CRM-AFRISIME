import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioFormDialog } from "@/components/scenarios/scenario-form-dialog";

const TYPE_LABELS: Record<string, string> = {
  EFFECTIF: "Variation d'effectifs",
  RESSOURCES: "Variation de ressources",
  PROJETS: "Variation de projets",
  NOUVELLE_FILIALE: "Nouvelle filiale",
  PERSONNALISE: "Personnalisé",
};

/**
 * V2.2 §14 — Scenario Planning. Liste + création ; le détail (impact
 * projeté) est sur /scenarios/[id], la comparaison multi-scénarios (§15)
 * sur /scenarios/comparaison.
 */
export default async function ScenariosPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.REPORT_EXPORT);

  const [scenarios, departments] = await Promise.all([
    prisma.scenario.findMany({ include: { department: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scénarios</h1>
          <p className="text-sm text-muted-foreground">
            Scenario planning — estimez l&apos;impact d&apos;une hypothèse avant de décider.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/scenarios/comparaison">
            <Badge variant="outline" className="cursor-pointer px-3 py-2 hover:bg-muted">
              Comparer plusieurs scénarios →
            </Badge>
          </Link>
          {canManage && <ScenarioFormDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />}
        </div>
      </div>

      {scenarios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun scénario créé pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <Link key={s.id} href={`/scenarios/${s.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{s.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="outline">{TYPE_LABELS[s.type] ?? s.type}</Badge>
                  <p className="text-sm text-muted-foreground">{s.department?.name ?? "Organisation entière"}</p>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
