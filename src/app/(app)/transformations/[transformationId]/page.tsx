import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { analyzeTransformationImpact } from "@/lib/change-impact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhaseTracker } from "@/components/transformations/phase-tracker";
import { CancelTransformationButton } from "@/components/transformations/cancel-transformation-button";
import { DependencyFormDialog } from "@/components/dependencies/dependency-form-dialog";

const TYPE_LABELS: Record<string, string> = {
  DIGITALE: "Transformation digitale",
  RESTRUCTURATION: "Restructuration",
  EXPANSION_GEOGRAPHIQUE: "Expansion géographique",
  CHANGEMENT_ORGANISATIONNEL: "Changement organisationnel",
  FUSION: "Fusion",
  ACQUISITION: "Acquisition",
  LANCEMENT_ACTIVITE: "Lancement d'activité",
};

// Digital Transformation Management (V3.0 §19) + Change Impact Analysis
// (V3.0 §20, "avant toute transformation") — l'analyse d'impact est
// recalculée à chaque visite à partir des dépendances enregistrées et du
// périmètre départemental (src/lib/change-impact.ts), jamais stockée.
export default async function TransformationDetailPage({
  params,
}: {
  params: Promise<{ transformationId: string }>;
}) {
  const { transformationId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);

  const [transformation, processus, projects] = await Promise.all([
    prisma.transformation.findUnique({
      where: { id: transformationId },
      include: { department: { select: { name: true } }, responsable: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.processus.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  if (!transformation) notFound();

  const impact = await analyzeTransformationImpact(transformationId);

  const dependencyOptionsByType = {
    Project: projects.map((p) => ({ id: p.id, label: p.nom })),
    Team: [],
    User: [],
    Processus: processus.map((p) => ({ id: p.id, label: p.nom })),
    MeetingDecision: [],
    GovernanceDecision: [],
    ProjectResource: [],
    CrmOrganization: [],
    CrmContact: [],
    Transformation: [],
    ProjectMilestone: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{transformation.nom}</h1>
            <Badge variant="outline">{TYPE_LABELS[transformation.type]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {transformation.department?.name ?? "Organisation entière"} — Responsable : {transformation.responsable.name}
          </p>
          {transformation.description && <p className="mt-1 text-sm">{transformation.description}</p>}
        </div>
        {canManage && transformation.statut === "EN_COURS" && <CancelTransformationButton id={transformation.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cycle de transformation</CardTitle>
        </CardHeader>
        <CardContent>
          <PhaseTracker transformationId={transformation.id} currentPhase={transformation.phase} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Analyse d&apos;impact du changement</CardTitle>
            <p className="text-xs text-muted-foreground">
              Qui est affecté, quels processus/projets changent, compétences nécessaires, risques, coûts et
              communications — recalculée à partir du périmètre et des dépendances enregistrées ci-dessous.
            </p>
          </div>
          {canManage && (
            <DependencyFormDialog
              optionsByType={dependencyOptionsByType}
              defaultSourceType="Transformation"
              defaultSourceId={transformation.id}
            />
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ImpactItem label="Personnes affectées" value={String(impact.personnesAffectees)} />
          <ImpactItem label="Coût organisationnel estimé" value={impact.coutOrganisationnel.toLocaleString("fr-FR")} />

          <ImpactList label="Processus concernés" items={impact.processusConcernes.map((p) => p.nom)} />
          <ImpactList label="Compétences nécessaires" items={impact.competencesNecessaires.map((c) => c.nom)} />
          <ImpactList label="Projets concernés" items={impact.projetsConcernes.map((p) => p.nom)} />
          <ImpactList label="Risques" items={impact.risques.map((r) => r.titre)} />
          <ImpactList label="Communications nécessaires" items={impact.communicationsNecessaires} />
        </CardContent>
      </Card>
    </div>
  );
}

function ImpactItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function ImpactList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">
        {label} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
