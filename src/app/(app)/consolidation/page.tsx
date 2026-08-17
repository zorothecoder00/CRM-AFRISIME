import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeEntityScopePilotage } from "@/lib/consolidation";
import { Globe2 } from "lucide-react";

/**
 * Consolidation Groupe (cahier des charges V2.2 §24) — drill-down
 * Groupe → Pays → Société → Direction → Département → Projet → Tâche.
 * Racine = entités sans parent ; leurs enfants directs sont groupés par pays.
 */
export default async function ConsolidationPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ENTITY_VIEW_ALL)) {
    redirect("/dashboard");
  }

  const allEntities = await prisma.entity.findMany({ select: { id: true, nom: true, parentId: true, pays: true } });
  const roots = allEntities.filter((e) => !e.parentId);

  const rootsWithPilotage = await Promise.all(
    roots.map(async (root) => ({
      ...root,
      pilotage: await computeEntityScopePilotage(root.id),
      children: allEntities.filter((e) => e.parentId === root.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consolidation Groupe</h1>
        <p className="text-sm text-muted-foreground">
          Vue Groupe → Pays → Société → Direction → Département → Projet → Tâche.
        </p>
      </div>

      {rootsWithPilotage.map((root) => {
        const paysGroups = new Map<string, typeof root.children>();
        for (const child of root.children) {
          const key = child.pays ?? "__none__";
          const list = paysGroups.get(key) ?? [];
          list.push(child);
          paysGroups.set(key, list);
        }

        return (
          <div key={root.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe2 className="h-5 w-5 text-muted-foreground" />
                  {root.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-3">
                <Info label="Effectif" value={`${root.pilotage.headcount}`} />
                <Info label="Projets actifs" value={`${root.pilotage.projectsActifs} / ${root.pilotage.projectsTotal}`} />
                <Info
                  label="Avancement moyen"
                  value={root.pilotage.avancementMoyen !== null ? `${root.pilotage.avancementMoyen}%` : "—"}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(paysGroups.entries()).map(([pays, entities]) =>
                pays === "__none__" ? (
                  entities.map((e) => (
                    <Link key={e.id} href={`/consolidation/entite/${e.id}`}>
                      <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                        <CardHeader>
                          <CardTitle className="text-base">{e.nom}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge variant="outline">Pays non renseigné</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                ) : (
                  <Link key={pays} href={`/consolidation/pays/${encodeURIComponent(pays)}`}>
                    <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-base">{pays}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{entities.length} société(s)/entité(s)</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              )}
              {root.children.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune sous-entité — voir directement les départements rattachés.</p>
              )}
            </div>
          </div>
        );
      })}

      {rootsWithPilotage.length === 0 && <p className="text-sm text-muted-foreground">Aucune entité pour le moment.</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
