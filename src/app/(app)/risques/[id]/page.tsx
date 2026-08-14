import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForCriticite, toneForRiskStatus, toneForNiveau } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskFormDialog } from "@/components/risques/risk-form-dialog";
import { TriggerAlertButton } from "@/components/risques/trigger-alert-button";

const STATUT_LABELS: Record<string, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
  SURVENU: "Survenu",
  CLOS: "Clos",
};

const CRITICITE_LABELS: Record<string, string> = {
  FAIBLE: "Faible",
  MODERE: "Modéré",
  IMPORTANT: "Important",
  ELEVE: "Élevé",
  CRITIQUE: "Critique",
};

const PROBABILITE_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYENNE: "Moyenne", ELEVEE: "Élevée" };
const IMPACT_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

export default async function RiskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.RISK_MANAGE);

  const [risk, users, projects, processus] = await Promise.all([
    prisma.organizationalRisk.findUnique({
      where: { id },
      include: { responsable: true, project: true, processus: true, createdBy: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { nom: "asc" } }),
    prisma.processus.findMany({ orderBy: { nom: "asc" } }),
  ]);

  if (!risk) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{risk.code}</p>
          <h1 className="text-2xl font-semibold">{risk.titre}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={toneForCriticite(risk.criticite)}>{CRITICITE_LABELS[risk.criticite]}</Badge>
            <Badge variant={toneForRiskStatus(risk.statut)}>{STATUT_LABELS[risk.statut]}</Badge>
            {risk.categorie && <Badge variant="outline">{risk.categorie}</Badge>}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <TriggerAlertButton riskId={risk.id} />
            <RiskFormDialog
              risk={{
                id: risk.id,
                titre: risk.titre,
                description: risk.description,
                categorie: risk.categorie,
                origine: risk.origine,
                probabilite: risk.probabilite,
                impact: risk.impact,
                responsableId: risk.responsableId,
                projectId: risk.projectId,
                processusId: risk.processusId,
                mesuresPreventives: risk.mesuresPreventives,
                planMitigation: risk.planMitigation,
                echeance: risk.echeance ? risk.echeance.toISOString() : null,
                statut: risk.statut,
              }}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
              processus={processus.map((p) => ({ id: p.id, label: p.nom }))}
            />
          </div>
        )}
      </div>

      {risk.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{risk.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={toneForNiveau(risk.probabilite)}>Probabilité : {PROBABILITE_LABELS[risk.probabilite]}</Badge>
            <Badge variant={toneForNiveau(risk.impact)}>Impact : {IMPACT_LABELS[risk.impact]}</Badge>
          </div>
          {risk.origine && <p>Origine : {risk.origine}</p>}
          {risk.responsable && <p>Responsable : {risk.responsable.name}</p>}
          {risk.echeance && <p>Échéance : {new Date(risk.echeance).toLocaleDateString("fr-FR")}</p>}
          {risk.project && (
            <p>
              Projet lié :{" "}
              <Link href={`/projets/${risk.project.id}`} className="text-primary hover:underline">
                {risk.project.nom}
              </Link>
            </p>
          )}
          {risk.processus && (
            <p>
              Processus lié :{" "}
              <Link href={`/processus/${risk.processus.id}`} className="text-primary hover:underline">
                {risk.processus.nom}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {(risk.mesuresPreventives || risk.planMitigation) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traitement du risque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {risk.mesuresPreventives && (
              <div>
                <p className="font-medium">Mesures préventives</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{risk.mesuresPreventives}</p>
              </div>
            )}
            {risk.planMitigation && (
              <div>
                <p className="font-medium">Plan de mitigation</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{risk.planMitigation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Créé par {risk.createdBy.name} le {new Date(risk.createdAt).toLocaleDateString("fr-FR")}
      </p>
    </div>
  );
}
