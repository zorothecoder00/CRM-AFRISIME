import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { buildSwotBoard, buildPriorities, buildRoadmap, buildTrackingAndGaps } from "@/lib/strategy-copilot";
import { SwotBoard } from "@/components/strategy/swot-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForPriority } from "@/lib/status-tone";

const PRIORITY_LABELS: Record<string, string> = { BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", CRITIQUE: "Critique" };

// Strategy Copilot (cahier des charges V3.0 §10) — synthese de construction
// strategique : SWOT (nouveau), priorites/OKR/feuille de route (rattaches a
// StrategicAxis/Objective/Indicator deja en place, voir /strategie et
// /objectifs), suivi strategique + analyse des ecarts (meme heuristique que
// le Conseiller strategique, §9).
export default async function StrategyCopilotPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLAN_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);

  const [board, priorities, roadmap, { tracking, ecarts }] = await Promise.all([
    buildSwotBoard(),
    buildPriorities(),
    buildRoadmap(),
    buildTrackingAndGaps(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Strategy Copilot</h1>
          <p className="text-sm text-muted-foreground">
            SWOT, priorités, OKR, feuille de route, suivi stratégique et analyse des écarts — construits à partir
            des axes, objectifs et indicateurs déjà en place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/strategie" className="text-sm text-primary hover:underline">
            Axes stratégiques →
          </Link>
          <Link href="/objectifs" className="text-sm text-primary hover:underline">
            Objectifs &amp; OKR →
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analyse SWOT</CardTitle>
        </CardHeader>
        <CardContent>
          <SwotBoard board={board} canManage={canManage} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priorités</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {priorities.length === 0 && <p className="text-sm text-muted-foreground">Aucun axe stratégique défini.</p>}
            {priorities.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.nom}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {a.objectifsCount} objectif(s) · {a.plansCount} plan(s)
                  </span>
                  <Badge variant={toneForPriority(a.priorite)}>{PRIORITY_LABELS[a.priorite]}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suivi stratégique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <div className="text-lg font-semibold">{tracking.totalObjectifs}</div>
                <div className="text-xs text-muted-foreground">Objectifs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-success">{tracking.atteints}</div>
                <div className="text-xs text-muted-foreground">Atteints</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-info">{tracking.enCours}</div>
                <div className="text-xs text-muted-foreground">En cours</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-destructive">{tracking.enRetard}</div>
                <div className="text-xs text-muted-foreground">En retard</div>
              </div>
            </div>
            {tracking.parAxe.length > 0 && (
              <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                {tracking.parAxe.map((a) => (
                  <li key={a.axeNom}>
                    {a.axeNom} : {a.total} objectif(s){a.enRetard > 0 ? `, ${a.enRetard} en retard` : ""}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analyse des écarts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Objectifs en cours dont l&apos;avancement réel est en retard sur l&apos;avancement temporel attendu.
          </p>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {ecarts.length === 0 && <p className="text-sm text-muted-foreground">Aucun écart significatif détecté.</p>}
          {ecarts.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>
                {e.titre} {e.axeNom ? <span className="text-xs text-muted-foreground">— {e.axeNom}</span> : null}
              </span>
              <Badge variant="destructive">{e.ecartPoints} pts de retard</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feuille de route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {roadmap.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun objectif rattaché à un axe stratégique pour le moment.</p>
          )}
          {roadmap.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">
                {r.dateDebut.toLocaleDateString("fr-FR")} → {r.dateFin.toLocaleDateString("fr-FR")}
              </span>
              <Badge variant="outline">{r.axeNom}</Badge>
              <span>{r.titre}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
