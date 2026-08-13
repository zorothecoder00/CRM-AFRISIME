import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { PlanFormDialog } from "@/components/planning/plan-form-dialog";
import { LinkObjectiveForm } from "@/components/planning/link-objective-form";
import { LinkProgrammeForm } from "@/components/planning/link-programme-form";
import { UnlinkObjectiveButton, UnlinkProgrammeButton } from "@/components/planning/unlink-buttons";

const NIVEAU_LABELS: Record<string, string> = {
  STRATEGIQUE: "Stratégique",
  ANNUEL: "Annuel",
  TRIMESTRIEL: "Trimestriel",
  MENSUEL: "Mensuel",
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  ATTEINT: "Atteint",
  NON_ATTEINT: "Non atteint",
  ANNULE: "Annulé",
};

export default async function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLAN_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);

  const [plan, departments, users, axes, parentCandidates, availableObjectives, availableProgrammes] =
    await Promise.all([
      prisma.plan.findUnique({
        where: { id: planId },
        include: {
          department: true,
          owner: true,
          axis: true,
          parent: true,
          children: { orderBy: { dateDebut: "asc" } },
          objectives: { orderBy: { dateDebut: "desc" } },
          programmes: { include: { responsable: true }, orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.strategicAxis.findMany({ orderBy: { nom: "asc" } }),
      prisma.plan.findMany({ where: { id: { not: planId } }, select: { id: true, nom: true } }),
      prisma.objective.findMany({
        where: { OR: [{ planId: null }, { planId: { not: planId } }] },
        orderBy: { titre: "asc" },
        select: { id: true, titre: true },
      }),
      prisma.programme.findMany({
        where: { OR: [{ planId: null }, { planId: { not: planId } }] },
        orderBy: { nom: "asc" },
        select: { id: true, nom: true },
      }),
    ]);

  if (!plan) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{plan.nom}</h1>
            <Badge variant="outline">{NIVEAU_LABELS[plan.niveau]}</Badge>
            <Badge variant={toneForStatus(plan.statut)}>{STATUS_LABELS[plan.statut]}</Badge>
          </div>
          {plan.parent && (
            <p className="mt-1 text-sm text-muted-foreground">
              Rattaché à{" "}
              <Link href={`/planification/${plan.parent.id}`} className="hover:underline">
                {plan.parent.nom}
              </Link>
            </p>
          )}
        </div>

        <Card accent={accentForStatus(plan.statut)}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Informations générales</CardTitle>
            {canManage && (
              <PlanFormDialog
                departments={departments.map((d) => ({ id: d.id, label: d.name }))}
                users={users.map((u) => ({ id: u.id, label: u.name }))}
                axes={axes.map((a) => ({ id: a.id, label: a.nom }))}
                parentOptions={parentCandidates.map((p) => ({ id: p.id, label: p.nom }))}
                currentUserId={session!.user.id}
                plan={{
                  id: plan.id,
                  nom: plan.nom,
                  niveau: plan.niveau,
                  description: plan.description,
                  dateDebut: plan.dateDebut.toISOString().slice(0, 10),
                  dateFin: plan.dateFin.toISOString().slice(0, 10),
                  budgetIndicatif: plan.budgetIndicatif ? String(plan.budgetIndicatif) : null,
                  priorites: plan.priorites,
                  axisId: plan.axisId,
                  departmentId: plan.departmentId,
                  parentId: plan.parentId,
                  ownerId: plan.ownerId,
                }}
              />
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Responsable" value={plan.owner.name} />
            <Info label="Département" value={plan.department?.name ?? "Toute l'organisation"} />
            <Info label="Date de début" value={plan.dateDebut.toLocaleDateString("fr-FR")} />
            <Info label="Date de fin" value={plan.dateFin.toLocaleDateString("fr-FR")} />
            <Info
              label="Budget indicatif"
              value={plan.budgetIndicatif ? `${Number(plan.budgetIndicatif).toLocaleString("fr-FR")} FCFA` : "—"}
            />
            <Info label="Sous-plans" value={String(plan.children.length)} />
            <Info label="Axe stratégique" value={plan.axis?.nom ?? "—"} />
          </CardContent>
          {plan.priorites && (
            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">Priorités</div>
              <p className="whitespace-pre-wrap text-sm">{plan.priorites}</p>
            </CardContent>
          )}
          {plan.description && (
            <CardContent className="pt-0 text-sm text-muted-foreground">{plan.description}</CardContent>
          )}
        </Card>

        {plan.children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sous-plans ({plan.children.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/planification/${child.id}`}
                      className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted"
                    >
                      <Badge variant="outline">{NIVEAU_LABELS[child.niveau]}</Badge>
                      <span className="font-medium">{child.nom}</span>
                      <Badge variant={toneForStatus(child.statut)}>{STATUS_LABELS[child.statut]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objectifs rattachés ({plan.objectives.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.objectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun objectif rattaché pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {plan.objectives.map((objective) => (
                  <li
                    key={objective.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <Link href={`/objectifs/${objective.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                      {objective.titre}
                    </Link>
                    <Badge variant={toneForStatus(objective.statut)}>
                      {OBJECTIVE_STATUS_LABELS[objective.statut]}
                    </Badge>
                    {canManage && <UnlinkObjectiveButton objectiveId={objective.id} />}
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <LinkObjectiveForm
                planId={plan.id}
                objectives={availableObjectives.map((o) => ({ id: o.id, label: o.titre }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programmes rattachés ({plan.programmes.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.programmes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun programme rattaché pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {plan.programmes.map((programme) => (
                  <li
                    key={programme.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <Link href={`/programmes/${programme.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                      {programme.nom}
                    </Link>
                    <span className="text-xs text-muted-foreground">{programme.responsable.name}</span>
                    <Badge variant={toneForStatus(programme.statut)}>{STATUS_LABELS[programme.statut]}</Badge>
                    {canManage && <UnlinkProgrammeButton programmeId={programme.id} />}
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <LinkProgrammeForm
                planId={plan.id}
                programmes={availableProgrammes.map((p) => ({ id: p.id, label: p.nom }))}
              />
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
