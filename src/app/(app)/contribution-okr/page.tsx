import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildAxisContribution, type ContributionNode } from "@/lib/okr-contribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { toneForStatus } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

function ObjectiveNodeView({ node, depth }: { node: ContributionNode; depth: number }) {
  return (
    <div className={cn("space-y-2 rounded-md border p-3", depth > 0 && "ml-4 border-dashed")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/objectifs/${node.id}`} className="font-medium hover:underline">
          {node.titre}
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={toneForStatus(node.statut)}>{node.statut}</Badge>
          <span className="text-xs text-muted-foreground">{node.progressPercent}%</span>
        </div>
      </div>
      <ProgressBar value={node.progressPercent} />

      {node.kpis.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {node.kpis.map((k) => (
            <Badge key={k.id} variant="outline">
              {k.nom} : {k.valeurActuelle}/{k.valeurCible}
            </Badge>
          ))}
        </div>
      )}

      {node.projet && (
        <Link href={`/projets/${node.projet.id}`} className="block text-xs text-primary hover:underline">
          Initiative / Projet : {node.projet.nom} →
        </Link>
      )}

      {node.taches.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {node.taches.map((t) => (
            <li key={t.id}>
              • {t.titre} <span className="text-[10px]">({t.statut})</span>
            </li>
          ))}
        </ul>
      )}

      {node.enfants.length > 0 && (
        <div className="space-y-2 pt-1">
          {node.enfants.map((child) => (
            <ObjectiveNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// OKR & Performance Management 3.0 (cahier des charges V3.0 §11) — trace la
// contribution de chaque niveau : Vision/Mission -> Axe -> Objectifs
// stratégiques -> OKR (objectifs enfants + KPI) -> Initiative/Projet ->
// Tâches. Racine choisie parmi les axes stratégiques déjà définis (/strategie).
export default async function ContributionOkrPage({
  searchParams,
}: {
  searchParams: Promise<{ axisId?: string }>;
}) {
  const sp = await searchParams;
  const axes = await prisma.strategicAxis.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
  const axisId = sp.axisId && axes.some((a) => a.id === sp.axisId) ? sp.axisId : axes[0]?.id;

  const contribution = axisId ? await buildAxisContribution(axisId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contribution OKR</h1>
        <p className="text-sm text-muted-foreground">
          Vision → Mission → Axe stratégique → Objectifs stratégiques → OKR → KPI → Initiative/Projet → Tâches.
        </p>
      </div>

      {axes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun axe stratégique défini pour le moment.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {axes.map((a) => (
              <Link key={a.id} href={`/contribution-okr?axisId=${a.id}`}>
                <Badge variant={a.id === axisId ? "default" : "outline"}>{a.nom}</Badge>
              </Link>
            ))}
          </div>

          {contribution && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vision &amp; Mission</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Vision</div>
                    <p className="whitespace-pre-wrap">{contribution.vision || "Non renseignée."}</p>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Mission</div>
                    <p className="whitespace-pre-wrap">{contribution.mission || "Non renseignée."}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{contribution.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contribution.objectifs.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun objectif rattaché à cet axe.</p>
                  )}
                  {contribution.objectifs.map((node) => (
                    <ObjectiveNodeView key={node.id} node={node} depth={0} />
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
