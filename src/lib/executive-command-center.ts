import { prisma } from "@/lib/prisma";
import { computeScopePilotage, type ScopePilotage } from "@/lib/pilotage-levels";
import { computeWorkload, ACTIVE_TASK_STATUSES, isSameCalendarDay } from "@/lib/workload";
import { computeTeamPrediction, type TeamPrediction } from "@/lib/predictive-scoring";
import { computePartnerEcosystemAnalysis } from "@/lib/partner-ecosystem-graph";

export type ExecutiveSnapshot = {
  performanceGlobale: ScopePilotage;
  objectifs: { total: number; enRetard: number; atteints: number };
  projetsCritiques: { id: string; nom: string; statut: string; avancement: number }[];
  risquesCritiques: { id: string; titre: string; criticite: string; type: "PROJET" | "ORGANISATIONNEL" }[];
  decisionsEnAttente: { id: string; libelle: string; href: string }[];
  chargeEquipes: { sousCharge: number; chargeNormale: number; surcharge: number };
  // Module "Planning personnel" §38 — organisation entière.
  taches: { aujourdhui: number; terminees: number; enRetard: number; bloquees: number };
  opportunitesCrm: { total: number; montantTotal: number; parStatut: Record<string, number> };
  alertes: { id: string; titre: string; contenu: string; createdAt: Date }[];
  previsionsIa: TeamPrediction;
  finances: {
    budgetTotalProjetsActifs: number;
    coutReelTotalProjetsActifs: number;
    ecartBudgetaire: number;
    systemesFinanciersConnectes: { id: string; nom: string; statut: string }[];
  };
  partenaires: { partenairesStrategiquesCount: number; relationsCritiquesCount: number; risquesCount: number };
};

/**
 * Strategic Command Center (cahier des charges V2.2 §29, étendu V3.0 §35
 * avec Finances et Partenaires) — n'introduit aucun nouveau calcul central :
 * agrège 11 sources déjà existantes (pilotage §XXIII, objectifs, projets/
 * risques, decisions de reunion/gouvernance, charge de travail §10, pipeline
 * CRM, AiAgentInsight §6, predictions §11, budget/coût projets + Integration
 * de type SYSTEME_FINANCIER pour "Finances via systèmes connectés", Partner
 * Ecosystem Graph §26 pour "Partenaires"). La page qui consomme ce snapshot
 * est gardee par PERMISSIONS.EXECUTIVE_VIEW.
 */
export async function buildExecutiveSnapshot(): Promise<ExecutiveSnapshot> {
  const now = new Date();

  const [
    activeUsers,
    allProjects,
    objectifsTotal,
    objectifsEnRetard,
    objectifsAtteints,
    projetsCritiques,
    orgRisquesCritiques,
    projectRisquesCritiques,
    meetingDecisionsEnAttente,
    governanceDecisionsEnAttente,
    tasks,
    leaves,
    opportunities,
    alertes,
  ] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, include: { role: true } }),
    prisma.project.findMany({ select: { id: true } }),
    prisma.objective.count(),
    prisma.objective.count({ where: { statut: "EN_COURS", dateFin: { lt: now } } }),
    prisma.objective.count({ where: { statut: "ATTEINT" } }),
    prisma.project.findMany({
      where: { priorite: "CRITIQUE", statut: { in: ["PLANIFIE", "EN_COURS"] } },
      select: { id: true, nom: true, statut: true, avancement: true },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organizationalRisk.findMany({
      where: { criticite: { in: ["ELEVE", "CRITIQUE"] }, statut: { notIn: ["MAITRISE", "CLOS"] } },
      select: { id: true, titre: true, criticite: true },
      take: 10,
    }),
    prisma.projectRisk.findMany({
      where: { impact: "ELEVE", probabilite: "ELEVEE", statut: { notIn: ["MAITRISE", "CLOS"] } },
      select: { id: true, titre: true },
      take: 10,
    }),
    prisma.meetingDecision.findMany({
      where: { statut: "EN_COURS" },
      select: { id: true, description: true, meetingId: true, projectId: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.governanceDecision.findMany({
      where: { statut: "EN_COURS" },
      select: { id: true, objet: true, meetingId: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      include: { assignees: { select: { userId: true } } },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" } }),
    prisma.crmOpportunity.findMany({ select: { montantEstime: true, statut: true } }),
    prisma.aiAgentInsight.findMany({
      where: { type: "ALERTE", statut: "NOUVEAU" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, titre: true, contenu: true, createdAt: true },
    }),
  ]);

  const [projetsActifsFinance, integrationsFinancieres, partenairesAnalysis] = await Promise.all([
    prisma.project.findMany({
      where: { statut: { in: ["PLANIFIE", "EN_COURS"] } },
      select: { budget: true, coutReel: true },
    }),
    prisma.integration.findMany({
      where: { type: "SYSTEME_FINANCIER" },
      select: { id: true, nom: true, statut: true },
    }),
    computePartnerEcosystemAnalysis(),
  ]);

  const userIds = activeUsers.map((u) => u.id);
  const projectIds = allProjects.map((p) => p.id);
  const [performanceGlobale, previsionsIa] = await Promise.all([
    computeScopePilotage({ userIds, projectIds }),
    computeTeamPrediction(userIds),
  ]);

  const workload = computeWorkload(
    activeUsers.map((u) => ({
      id: u.id,
      name: u.name,
      roleLabel: u.role.label,
      capaciteHebdomadaireHeures: Number(u.capaciteHebdomadaireHeures),
    })),
    tasks.map((t) => ({
      statut: t.statut,
      tempsEstimeHeures: t.tempsEstimeHeures !== null ? Number(t.tempsEstimeHeures) : null,
      tempsReelHeures: t.tempsReelHeures !== null ? Number(t.tempsReelHeures) : null,
      responsablePrincipalId: t.responsablePrincipalId,
      assigneeIds: t.assignees.map((a) => a.userId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    leaves.map((l) => ({ userId: l.userId, dateDebut: l.dateDebut, dateFin: l.dateFin, statut: l.statut }))
  );
  const chargeEquipes = {
    sousCharge: workload.filter((w) => w.statut === "SOUS_CHARGE").length,
    chargeNormale: workload.filter((w) => w.statut === "CHARGE_NORMALE").length,
    surcharge: workload.filter((w) => w.statut === "SURCHARGE").length,
  };

  // §38 — "Tâches aujourd'hui" = celles dont le début ou l'échéance tombe
  // aujourd'hui ; "Terminées" est le sous-ensemble de celles-là déjà closes.
  const tachesAujourdhui = tasks.filter(
    (t) => (t.echeance && isSameCalendarDay(t.echeance, now)) || (t.dateDebut && isSameCalendarDay(t.dateDebut, now))
  );
  const taches = {
    aujourdhui: tachesAujourdhui.length,
    terminees: tachesAujourdhui.filter((t) => t.statut === "TERMINEE").length,
    enRetard: tasks.filter((t) => ACTIVE_TASK_STATUSES.has(t.statut) && t.echeance && t.echeance < now).length,
    bloquees: tasks.filter((t) => t.statut === "BLOQUEE").length,
  };

  const parStatut: Record<string, number> = {};
  for (const o of opportunities) parStatut[o.statut] = (parStatut[o.statut] ?? 0) + 1;

  return {
    performanceGlobale,
    objectifs: { total: objectifsTotal, enRetard: objectifsEnRetard, atteints: objectifsAtteints },
    projetsCritiques: projetsCritiques.map((p) => ({ id: p.id, nom: p.nom, statut: p.statut, avancement: p.avancement })),
    risquesCritiques: [
      ...orgRisquesCritiques.map((r) => ({ id: r.id, titre: r.titre, criticite: r.criticite, type: "ORGANISATIONNEL" as const })),
      ...projectRisquesCritiques.map((r) => ({ id: r.id, titre: r.titre, criticite: "ELEVE", type: "PROJET" as const })),
    ],
    decisionsEnAttente: [
      ...meetingDecisionsEnAttente.map((d) => ({
        id: d.id,
        libelle: d.description,
        href: d.meetingId ? `/reunions/${d.meetingId}` : d.projectId ? `/projets/${d.projectId}` : "/reunions",
      })),
      ...governanceDecisionsEnAttente.map((d) => ({
        id: d.id,
        libelle: d.objet,
        href: `/gouvernance/reunions/${d.meetingId}`,
      })),
    ],
    chargeEquipes,
    taches,
    opportunitesCrm: {
      total: opportunities.length,
      montantTotal: opportunities.reduce((s, o) => s + (o.montantEstime ? Number(o.montantEstime) : 0), 0),
      parStatut,
    },
    alertes,
    previsionsIa,
    finances: {
      budgetTotalProjetsActifs: projetsActifsFinance.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0),
      coutReelTotalProjetsActifs: projetsActifsFinance.reduce((s, p) => s + (p.coutReel ? Number(p.coutReel) : 0), 0),
      ecartBudgetaire: projetsActifsFinance.reduce(
        (s, p) => s + ((p.coutReel ? Number(p.coutReel) : 0) - (p.budget ? Number(p.budget) : 0)),
        0
      ),
      systemesFinanciersConnectes: integrationsFinancieres,
    },
    partenaires: {
      partenairesStrategiquesCount: partenairesAnalysis.partenairesStrategiques.length,
      relationsCritiquesCount: partenairesAnalysis.relationsCritiques.length,
      risquesCount: partenairesAnalysis.risques.length,
    },
  };
}
