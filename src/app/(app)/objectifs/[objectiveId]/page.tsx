import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { objectiveProgress } from "@/lib/objective-progress";
import { predictObjectivePerformance } from "@/lib/performance-prediction";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { IndicatorList } from "@/components/objectives/indicator-list";
import { AddIndicatorDialog } from "@/components/objectives/add-indicator-dialog";
import { ObjectiveStatusSelect } from "@/components/objectives/objective-status-select";
import { ObjectiveEditDialog } from "@/components/objectives/objective-edit-dialog";
import { LinkParentObjectiveForm } from "@/components/objectives/link-parent-objective-form";
import { accentForStatus, toneForStatus } from "@/lib/status-tone";
import { BackLink } from "@/components/ui/back-link";

const PERIOD_LABELS: Record<string, string> = {
  ANNUEL: "Annuel",
  TRIMESTRIEL: "Trimestriel",
  MENSUEL: "Mensuel",
  HEBDOMADAIRE: "Hebdomadaire",
};

const SCOPE_LABELS: Record<string, string> = {
  ORGANISATION: "Organisation entière",
  INDIVIDUEL: "Individuel",
  EQUIPE: "Équipe",
  DEPARTEMENT: "Département",
  PROGRAMME: "Programme",
};

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ATTEINT: "Atteint",
  NON_ATTEINT: "Non atteint",
  ANNULE: "Annulé",
};

export default async function ObjectiveDetailPage({
  params,
}: {
  params: Promise<{ objectiveId: string }>;
}) {
  const { objectiveId } = await params;

  const [objective, candidateObjectives, linkedTasks, linkedEntries] = await Promise.all([
    prisma.objective.findUnique({
      where: { id: objectiveId },
      include: {
        user: true,
        project: true,
        department: true,
        programme: true,
        axis: true,
        createdBy: true,
        indicators: { orderBy: { createdAt: "asc" } },
        parent: true,
        children: true,
      },
    }),
    prisma.objective.findMany({
      where: { id: { not: objectiveId } },
      orderBy: { titre: "asc" },
      select: { id: true, titre: true },
    }),
    // §20 (Module Planning personnel) — contribution : tâches rattachées à
    // l'objectif, terminées vs total.
    prisma.task.findMany({ where: { objectiveId }, select: { statut: true } }),
    prisma.personalPlanningEntry.findMany({ where: { objectifId: objectiveId }, select: { statut: true } }),
  ]);

  if (!objective) {
    notFound();
  }

  const contribution = {
    tachesTotal: linkedTasks.length,
    tachesTerminees: linkedTasks.filter((t) => t.statut === "TERMINEE").length,
    activitesTotal: linkedEntries.length,
    activitesTerminees: linkedEntries.filter((e) => e.statut === "TERMINEE").length,
  };

  const progress = objectiveProgress(
    objective.indicators.map((i) => ({
      valeurActuelle: Number(i.valeurActuelle),
      valeurCible: Number(i.valeurCible),
    }))
  );

  const prediction = objective.statut === "EN_COURS" ? await predictObjectivePerformance(objective.id) : null;

  const target =
    objective.scope === "INDIVIDUEL"
      ? objective.user?.name
      : objective.scope === "EQUIPE"
        ? objective.project?.nom
        : objective.scope === "DEPARTEMENT"
          ? objective.department?.name
          : objective.programme?.nom;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <BackLink href="/objectifs" label="Retour aux objectifs" />
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-2xl font-semibold">{objective.titre}</h1>
            <ObjectiveEditDialog
              objective={{
                id: objective.id,
                titre: objective.titre,
                description: objective.description,
                periode: objective.periode,
                dateDebut: objective.dateDebut,
                dateFin: objective.dateFin,
              }}
            />
          </div>
          {objective.description && (
            <p className="mt-1 text-sm text-muted-foreground">{objective.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{PERIOD_LABELS[objective.periode]}</Badge>
            <Badge variant="outline">{SCOPE_LABELS[objective.scope]}</Badge>
            {objective.scope === "EQUIPE" && objective.project && (
              <Link href={`/projets/${objective.project.id}`} className="text-sm text-primary hover:underline">
                {objective.project.nom}
              </Link>
            )}
            {objective.scope === "PROGRAMME" && objective.programme && (
              <Link href={`/programmes/${objective.programme.id}`} className="text-sm text-primary hover:underline">
                {objective.programme.nom}
              </Link>
            )}
            {target && objective.scope !== "EQUIPE" && objective.scope !== "PROGRAMME" && (
              <span className="text-sm text-muted-foreground">{target}</span>
            )}
            {objective.axis && <Badge variant="outline">↗ {objective.axis.nom}</Badge>}
          </div>
        </div>

        <Card accent={accentForStatus(objective.statut)}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Résultats clés (Key Results)</CardTitle>
            <AddIndicatorDialog objectiveId={objective.id} />
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">Score OKR</span>
                <span>
                  {(progress / 100).toFixed(2)} <span className="text-muted-foreground">({progress}%)</span>
                </span>
              </div>
              <ProgressBar value={progress} />
            </div>
            <IndicatorList
              indicators={objective.indicators.map((i) => ({
                id: i.id,
                nom: i.nom,
                unite: i.unite,
                valeurCible: Number(i.valeurCible),
                valeurActuelle: Number(i.valeurActuelle),
              }))}
            />
          </CardContent>
        </Card>

        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prévision de performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold">{prediction.progressionActuelle}%</div>
                  <div className="text-xs text-muted-foreground">Progression actuelle</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-info">{prediction.previsionIA}%</div>
                  <div className="text-xs text-muted-foreground">Prévision IA</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-success">{prediction.probabiliteAtteinte}%</div>
                  <div className="text-xs text-muted-foreground">Probabilité d&apos;atteinte</div>
                </div>
              </div>
              <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                {prediction.facteurs.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Statut</div>
              <ObjectiveStatusSelect objectiveId={objective.id} initialStatut={objective.statut} />
            </div>
            <Info
              label="Période"
              value={`${new Date(objective.dateDebut).toLocaleDateString("fr-FR")} → ${new Date(objective.dateFin).toLocaleDateString("fr-FR")}`}
            />
            <Info label="Créé par" value={objective.createdBy.name} />
          </CardContent>
        </Card>

        {(contribution.tachesTotal > 0 || contribution.activitesTotal > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contribution.tachesTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tâches liées</span>
                  <span className="font-medium">
                    {contribution.tachesTerminees} / {contribution.tachesTotal} terminées
                  </span>
                </div>
              )}
              {contribution.activitesTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Activités planifiées</span>
                  <span className="font-medium">
                    {contribution.activitesTerminees} / {contribution.activitesTotal} terminées
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cascade d&apos;objectifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {objective.parent ? (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Objectif parent</div>
                <Link href={`/objectifs/${objective.parent.id}`} className="text-primary hover:underline">
                  {objective.parent.titre}
                </Link>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Objectif de premier niveau (pas de parent).</p>
            )}
            <LinkParentObjectiveForm
              objectiveId={objective.id}
              candidates={candidateObjectives.map((o) => ({ id: o.id, label: o.titre }))}
              hasParent={!!objective.parent}
            />
            {objective.children.length > 0 && (
              <div>
                <div className="mb-1 mt-2 text-xs text-muted-foreground">
                  Objectifs enfants ({objective.children.length})
                </div>
                <ul className="space-y-1.5">
                  {objective.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/objectifs/${child.id}`}
                        className="flex items-center justify-between gap-2 rounded-md border p-1.5 text-xs hover:bg-muted"
                      >
                        <span className="truncate">{child.titre}</span>
                        <Badge variant={toneForStatus(child.statut)} className="shrink-0">
                          {STATUS_LABELS[child.statut]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
