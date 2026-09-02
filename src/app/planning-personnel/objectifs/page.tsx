import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { objectiveProgress } from "@/lib/objective-progress";
import type { ObjectivePeriod, ObjectiveScope } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/ui/back-link";
import { PersonalPlanningCrosslinks } from "@/components/personal-planning/personal-planning-crosslinks";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { ObjectiveFormDialog } from "@/components/objectives/objective-form-dialog";
import { ProgressBar } from "@/components/objectives/progress-bar";

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

/**
 * "Mes objectifs" (prototype V2) — page dédiée au module Planning personnel :
 * même contenu/filtres que /objectifs (page générale), mais strictement mes
 * objectifs (userId = moi), sans condition ni échappatoire — même pour un
 * super admin. Vit sous /planning-personnel/*, donc partage sa sidebar/
 * toolbar sans jamais retomber sur le layout global (voir /taches, /reunions
 * pour le même souci évité ici dès la conception).
 */
export default async function PersonalPlanningObjectifsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; scope?: string }>;
}) {
  const { periode, scope } = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [objectives, users, projects, departments, programmes, axes, allObjectives] = await Promise.all([
    prisma.objective.findMany({
      where: {
        periode: periode as ObjectivePeriod | undefined,
        scope: scope as ObjectiveScope | undefined,
        userId,
      },
      include: {
        user: true,
        project: true,
        department: true,
        programme: true,
        axis: true,
        indicators: true,
        parent: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.programme.findMany({ orderBy: { nom: "asc" } }),
    prisma.strategicAxis.findMany({ orderBy: { nom: "asc" } }),
    prisma.objective.findMany({ orderBy: { titre: "asc" }, select: { id: true, titre: true } }),
  ]);

  const filterHref = (key: "periode" | "scope", value?: string) => {
    const params = new URLSearchParams();
    if (key === "periode" ? value : periode) params.set("periode", key === "periode" ? value! : periode!);
    if (key === "scope" ? value : scope) params.set("scope", key === "scope" ? value! : scope!);
    const qs = params.toString();
    return `/planning-personnel/objectifs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <BackLink href="/planning-personnel" label="Retour à mon planning personnel" />
      <PersonalPlanningCrosslinks current="/planning-personnel" />

      <div className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Mes objectifs</h1>
            <p className="text-sm text-muted-foreground">{objectives.length} objectif(s)</p>
          </div>
          <ObjectiveFormDialog
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            programmes={programmes.map((p) => ({ id: p.id, label: p.nom }))}
            axes={axes.map((a) => ({ id: a.id, label: a.nom }))}
            objectives={allObjectives.map((o) => ({ id: o.id, label: o.titre }))}
            currentUserId={userId}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={filterHref("periode", undefined)}>
            <Button variant={!periode ? "default" : "outline"} size="sm">
              Toutes périodes
            </Button>
          </Link>
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <Link key={key} href={filterHref("periode", key)}>
              <Button variant={periode === key ? "default" : "outline"} size="sm">
                {label}
              </Button>
            </Link>
          ))}
          <span className="mx-2 text-muted-foreground">·</span>
          <Link href={filterHref("scope", undefined)}>
            <Button variant={!scope ? "default" : "outline"} size="sm">
              Toutes portées
            </Button>
          </Link>
          {Object.entries(SCOPE_LABELS).map(([key, label]) => (
            <Link key={key} href={filterHref("scope", key)}>
              <Button variant={scope === key ? "default" : "outline"} size="sm">
                {label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objectives.map((objective) => {
          const progress = objectiveProgress(
            objective.indicators.map((i) => ({
              valeurActuelle: Number(i.valeurActuelle),
              valeurCible: Number(i.valeurCible),
            }))
          );
          const target =
            objective.scope === "INDIVIDUEL"
              ? objective.user?.name
              : objective.scope === "EQUIPE"
                ? objective.project?.nom
                : objective.scope === "DEPARTEMENT"
                  ? objective.department?.name
                  : objective.programme?.nom;

          return (
            <Link key={objective.id} href={`/objectifs/${objective.id}?from=planning-personnel`}>
              <Card
                accent={accentForStatus(objective.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="text-base">{objective.titre}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{PERIOD_LABELS[objective.periode]}</Badge>
                    <Badge variant="outline">{SCOPE_LABELS[objective.scope]}</Badge>
                    <Badge variant={toneForStatus(objective.statut)}>{STATUS_LABELS[objective.statut]}</Badge>
                  </div>
                  {target && <p className="text-sm text-muted-foreground">{target}</p>}
                  {objective.axis && <Badge variant="outline">{objective.axis.nom}</Badge>}
                  {objective.parent && (
                    <p className="text-xs text-muted-foreground">↳ {objective.parent.titre}</p>
                  )}
                  <ProgressBar value={progress} />
                  <p className="text-xs text-muted-foreground">{progress}% · {objective.indicators.length} indicateur(s)</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {objectives.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun objectif pour le moment.</p>
        )}
        </div>
      </div>
    </div>
  );
}
