import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { REPORT_TYPES, REPORT_LABELS, type ReportType } from "@/lib/reports";
import { departmentLevelLabel, computeDepartmentDepth } from "@/lib/department-tree";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportTargetLinks } from "@/components/rapports/report-target-links";
import { ActivityReportUploadDialog } from "@/components/rapports/activity-report-upload-dialog";
import { ActivityReportsList, type ActivityReportRow } from "@/components/rapports/activity-reports-list";

// Demande utilisateur — 2 blocs : "Rapports automatiques" (generes depuis les
// donnees) vs "Rapports d'activite (manuels)" (exportes a la demande, PV/
// gouvernance, et desormais rapports importes/uploades a partager).
const AUTOMATIC_TYPES: ReportType[] = ["MENSUEL", "TRIMESTRIEL", "ANNUEL", "REVUE_HEBDOMADAIRE", "ACTIVITE", "AUDIT"];
const MANUAL_EXPORT_TYPES: ReportType[] = REPORT_TYPES.filter(
  (t) => t !== "CHARTE_PROJET" && !AUTOMATIC_TYPES.includes(t)
);

const FORMATS: { format: string; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "excel", label: "Excel" },
  { format: "word", label: "Word" },
  { format: "presentation", label: "Présentation" },
];

const DESCRIPTIONS: Record<ReportType, string> = {
  PROJETS: "Liste des projets avec département, responsable, statut, avancement et budget.",
  PROGRAMMES: "Liste des programmes avec responsable, statut, projets associés, avancement et budget.",
  TACHES: "Liste des tâches avec projet, responsable, statut, priorité et échéance.",
  CHARGE_TRAVAIL: "Charge de travail par collaborateur : tâches actives, occupation, disponibilité.",
  OBJECTIFS: "Objectifs et progression de leurs indicateurs.",
  PRODUCTIVITE: "Tâches terminées sur 30 jours et respect des délais, par collaborateur.",
  ACTIVITE: "Journal des actions récentes (30 jours) à travers l'application.",
  PERFORMANCE: "Avancement moyen des projets et progression des objectifs, par département.",
  HEURES_PASSEES: "Total des heures réellement passées par collaborateur.",
  DEPARTEMENT: "Projets d'un département et de ses sous-services — choisissez le département.",
  DIRECTION: "Projets d'une direction et de tous ses départements/services — choisissez la direction.",
  MENSUEL: "Tâches terminées et état des projets sur le dernier mois.",
  TRIMESTRIEL: "Tâches terminées et état des projets sur le dernier trimestre.",
  ANNUEL: "Tâches terminées et état des projets sur la dernière année.",
  AUDIT: "Journal d'audit détaillé (90 jours) — actions, utilisateurs, entités concernées.",
  RISQUES: "Registre consolidé des risques projet et organisationnels.",
  GOUVERNANCE: "Décisions de gouvernance, toutes instances confondues.",
  REVUE_HEBDOMADAIRE:
    "Weekly Business Review (§31) : activités, résultats, objectifs, projets, risques, incidents, décisions, CRM, performances et recommandations de la semaine.",
  CHARTE_PROJET:
    "Charte de projet — accessible depuis l'onglet Charte de chaque fiche projet (nécessite de choisir un projet).",
};

export default async function RapportsPage() {
  const session = await getAppSession();
  if (!session!.user.permissions.includes(PERMISSIONS.REPORT_EXPORT)) {
    redirect("/dashboard");
  }
  const userId = session!.user.id;
  const canDeleteAnyReport = session!.user.permissions.includes(PERMISSIONS.DOCUMENT_DELETE);

  const [departments, users, teams, activityReports] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.user.findMany({ where: { isActive: true, id: { not: userId } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    // Rapports d'activite (manuels) visibles : les miens, ceux partages avec
    // moi directement, ou partages avec une equipe dont je suis membre.
    prisma.activityReport.findMany({
      where: {
        deletedAt: null,
        OR: [
          { createdById: userId },
          { shares: { some: { userId } } },
          { shares: { some: { team: { members: { some: { userId } } } } } },
        ],
      },
      include: {
        createdBy: { select: { name: true } },
        shares: {
          include: { user: { select: { name: true } }, team: { select: { nom: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const directions = departments.filter((d) => computeDepartmentDepth(d.id, new Map(departments.map((x) => [x.id, x]))) === 0);
  const depthMap = new Map(departments.map((x) => [x.id, x]));

  const activityReportRows: ActivityReportRow[] = activityReports.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    url: r.url,
    sizeBytes: r.sizeBytes,
    createdByNom: r.createdBy.name,
    createdById: r.createdById,
    createdAt: r.createdAt.toISOString(),
    shares: r.shares.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user?.name ?? null,
      teamId: s.teamId,
      teamName: s.team?.nom ?? null,
    })),
  }));
  const userOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const teamOptions = teams.map((t) => ({ id: t.id, label: t.nom }));

  function renderCard(type: ReportType) {
    return (
      <Card key={type}>
        <CardHeader>
          <CardTitle className="text-base">{REPORT_LABELS[type]}</CardTitle>
          <CardDescription>{DESCRIPTIONS[type]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {type === "DEPARTEMENT" && (
            <ReportTargetLinks
              type={type}
              options={departments.map((d) => ({
                id: d.id,
                label: `${d.name} (${departmentLevelLabel(computeDepartmentDepth(d.id, depthMap))})`,
              }))}
              formats={FORMATS}
              placeholder="Département"
            />
          )}
          {type === "DIRECTION" && (
            <ReportTargetLinks
              type={type}
              options={directions.map((d) => ({ id: d.id, label: d.name }))}
              formats={FORMATS}
              placeholder="Direction"
            />
          )}
          {type !== "DEPARTEMENT" &&
            type !== "DIRECTION" &&
            FORMATS.map(({ format, label }) => (
              <a
                key={format}
                href={`/api/rapports/${type}?format=${format}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {label}
              </a>
            ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Rapports</h1>
        <p className="text-sm text-muted-foreground">
          Exportez les données de la plateforme en PDF, Excel, Word ou présentation.
        </p>
      </div>

      <ReportSection title="Rapports automatiques">
        <div className="grid gap-4 md:grid-cols-2">{AUTOMATIC_TYPES.map(renderCard)}</div>
      </ReportSection>

      <ReportSection
        title="Rapports d'activité (manuels)"
        description="Documents à exporter à la demande, PV/gouvernance, et rapports importés — partageables à des utilisateurs ou des équipes."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {MANUAL_EXPORT_TYPES.map(renderCard)}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comptes rendus de réunion</CardTitle>
              <CardDescription>Procès-verbaux rédigés depuis la fiche de chaque réunion.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reunions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Voir les réunions
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Rapports importés</h3>
              <p className="text-[11px] text-muted-foreground">
                {activityReportRows.length} rapport(s) — rédigés hors de l&apos;application, à partager.
              </p>
            </div>
            <ActivityReportUploadDialog />
          </div>
          <ActivityReportsList
            reports={activityReportRows}
            users={userOptions}
            teams={teamOptions}
            currentUserId={userId}
            canDeleteAny={canDeleteAnyReport}
          />
        </div>
      </ReportSection>
    </div>
  );
}

function ReportSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
