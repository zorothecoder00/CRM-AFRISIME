import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import type { AiAgentType, AiInsightType } from "@/generated/prisma/enums";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CRM_STAGNATION_DAYS = 14;
const KPI_ECART_THRESHOLD_PERCENT = 20;
const BLOCKED_VALIDATION_THRESHOLD_MS = 3 * MS_PER_DAY;

/**
 * Agents IA spécialisés (V2.2 §6) — 6 fonctions déterministes (pas d'appel
 * LLM tant qu'aucune clé API n'est configurée, cf. décision produit) qui
 * scannent les données déjà en place et écrivent des AiAgentInsight,
 * appelées une fois par jour depuis le cron (src/app/api/cron/daily-checks/
 * route.ts, après les règles d'automatisation). `contenu` est du texte
 * templaté aujourd'hui, remplaçable demain par une vraie génération LLM
 * sans changer le schéma. Dédupliqué par (agent, entityType, entityId) tant
 * que l'insight précédent n'a pas été traité/ignoré, pour ne pas ré-empiler
 * la même alerte chaque jour.
 */
async function recordInsight(params: {
  agent: AiAgentType;
  type: AiInsightType;
  titre: string;
  contenu: string;
  entityType: string;
  entityId: string;
  notifyUserId?: string | null;
}) {
  const existing = await prisma.aiAgentInsight.findFirst({
    where: {
      agent: params.agent,
      entityType: params.entityType,
      entityId: params.entityId,
      statut: { in: ["NOUVEAU", "VU"] },
    },
  });
  if (existing) return;

  const insight = await prisma.aiAgentInsight.create({
    data: {
      agent: params.agent,
      type: params.type,
      titre: params.titre,
      contenu: params.contenu,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });

  if (params.notifyUserId) {
    await createNotification({
      userId: params.notifyUserId,
      type: "MODIFICATION",
      titre: `[IA] ${params.titre}`,
      lien: "/agents-ia",
      entityType: "AiAgentInsight",
      entityId: insight.id,
    });
  }
}

/** AI Project Manager — surveille les projets, détecte les retards, propose des actions, prépare des rapports. */
async function runProjectManagerAgent() {
  const projects = await prisma.project.findMany({
    where: { statut: "EN_COURS" },
    select: { id: true, nom: true, responsableId: true, dateFin: true, budget: true, coutReel: true },
  });

  for (const p of projects) {
    const retard = p.dateFin && p.dateFin.getTime() < Date.now();
    const depassement = p.budget !== null && p.coutReel !== null && Number(p.coutReel) > Number(p.budget);
    if (!retard && !depassement) continue;

    const joursRetard = retard ? Math.floor((Date.now() - p.dateFin!.getTime()) / MS_PER_DAY) : 0;
    const raisons = [
      retard ? `retard de ${joursRetard} jour(s)` : null,
      depassement ? "budget dépassé" : null,
    ].filter(Boolean);

    await recordInsight({
      agent: "PROJECT_MANAGER",
      type: "ALERTE",
      titre: `Projet à surveiller : ${p.nom}`,
      contenu: `${p.nom} présente ${raisons.join(" et ")}. Action proposée : revoir le plan de charge avec le responsable et, si nécessaire, réaffecter des ressources ou ajuster l'échéance. Rapport détaillé : /rapports?type=PROJETS.`,
      entityType: "Project",
      entityId: p.id,
      // Déjà notifié directement par le cron (alertes retard/budget) —
      // l'agent se contente d'agréger, pas de notifier une seconde fois.
    });
  }
}

/** AI CRM Manager — analyse les prospects, identifie les relances, détecte les opportunités, propose les priorités. */
async function runCrmManagerAgent() {
  const stagnationCutoff = new Date(Date.now() - CRM_STAGNATION_DAYS * MS_PER_DAY);
  const opportunities = await prisma.crmOpportunity.findMany({
    where: { statut: { notIn: ["GAGNEE", "PERDUE"] } },
    select: { id: true, nom: true, ownerId: true, statut: true, probabilite: true, montantEstime: true, updatedAt: true, dateClotureEstimee: true },
  });

  for (const o of opportunities) {
    const stagnante = o.updatedAt < stagnationCutoff;
    const prioritaire =
      (o.probabilite ?? 0) >= 70 &&
      o.dateClotureEstimee !== null &&
      o.dateClotureEstimee.getTime() - Date.now() < 7 * MS_PER_DAY;
    if (!stagnante && !prioritaire) continue;

    await recordInsight({
      agent: "CRM_MANAGER",
      type: prioritaire ? "RECOMMANDATION" : "ALERTE",
      titre: prioritaire ? `Opportunité prioritaire : ${o.nom}` : `Relance suggérée : ${o.nom}`,
      contenu: prioritaire
        ? `${o.nom} a ${o.probabilite}% de probabilité et une clôture estimée sous 7 jours (${o.montantEstime ? `${o.montantEstime} FCFA` : "montant non estimé"}). Priorité commerciale proposée cette semaine.`
        : `${o.nom} n'a pas été mise à jour depuis plus de ${CRM_STAGNATION_DAYS} jours (statut : ${o.statut}). Relance recommandée pour éviter la perte de l'opportunité.`,
      entityType: "CrmOpportunity",
      entityId: o.id,
      notifyUserId: o.ownerId,
    });
  }
}

/** AI Risk Manager — analyse les risques, identifie les nouveaux risques, surveille les plans de mitigation. */
async function runRiskManagerAgent() {
  const [projectRisks, orgRisks] = await Promise.all([
    prisma.projectRisk.findMany({
      where: { statut: { notIn: ["MAITRISE", "CLOS"] }, planMitigation: null, OR: [{ probabilite: "ELEVEE" }, { impact: "ELEVE" }] },
      select: { id: true, titre: true, responsableId: true, projectId: true },
    }),
    prisma.organizationalRisk.findMany({
      where: { statut: { notIn: ["MAITRISE", "CLOS"] }, planMitigation: null, criticite: { in: ["ELEVE", "CRITIQUE"] } },
      select: { id: true, titre: true, responsableId: true },
    }),
  ]);

  for (const r of projectRisks) {
    await recordInsight({
      agent: "RISK_MANAGER",
      type: "ALERTE",
      titre: `Risque sans plan de mitigation : ${r.titre}`,
      contenu: `${r.titre} est un risque probable/élevé sans plan de mitigation renseigné. Action proposée : définir un plan de mitigation avant que le risque ne se matérialise.`,
      entityType: "ProjectRisk",
      entityId: r.id,
      notifyUserId: r.responsableId,
    });
  }
  for (const r of orgRisks) {
    await recordInsight({
      agent: "RISK_MANAGER",
      type: "ALERTE",
      titre: `Risque organisationnel sans plan de mitigation : ${r.titre}`,
      contenu: `${r.titre} est un risque de criticité élevée/critique sans plan de mitigation renseigné. Action proposée : définir un plan de mitigation.`,
      entityType: "OrganizationalRisk",
      entityId: r.id,
      notifyUserId: r.responsableId,
    });
  }
}

/** AI Analyst — analyse les KPI, produit des rapports, détecte les anomalies. */
async function runAnalystAgent() {
  const indicators = await prisma.indicator.findMany({
    where: { valeurCible: { gt: 0 } },
    select: { id: true, nom: true, valeurCible: true, valeurActuelle: true, projectId: true, objectiveId: true },
  });

  for (const ind of indicators) {
    const ecart = Math.round(((Number(ind.valeurActuelle) - Number(ind.valeurCible)) / Number(ind.valeurCible)) * 100);
    if (Math.abs(ecart) < KPI_ECART_THRESHOLD_PERCENT) continue;

    await recordInsight({
      agent: "ANALYST",
      type: "ANOMALIE",
      titre: `Écart KPI détecté : ${ind.nom}`,
      contenu: `${ind.nom} s'écarte de sa cible de ${ecart}% (actuel : ${ind.valeurActuelle}, cible : ${ind.valeurCible}). Rapport détaillé : /rapports?type=OBJECTIFS.`,
      entityType: "Indicator",
      entityId: ind.id,
    });
  }
}

/** AI Administrative Assistant — prépare les documents, suit les demandes, surveille les validations. */
async function runAdministrativeAssistantAgent() {
  const blockedSince = new Date(Date.now() - BLOCKED_VALIDATION_THRESHOLD_MS);
  const [blockedRequests, blockedTasks] = await Promise.all([
    prisma.adminRequestValidationRun.findMany({
      where: { statut: "EN_COURS", updatedAt: { lt: blockedSince } },
      include: { adminRequest: { select: { titre: true, demandeurId: true } } },
    }),
    prisma.taskValidationRun.findMany({
      where: { statut: "EN_COURS", updatedAt: { lt: blockedSince } },
      include: { task: { select: { titre: true, responsablePrincipalId: true } } },
    }),
  ]);

  for (const run of blockedRequests) {
    await recordInsight({
      agent: "ADMINISTRATIVE_ASSISTANT",
      type: "ALERTE",
      titre: `Demande bloquée : ${run.adminRequest.titre}`,
      contenu: `${run.adminRequest.titre} est en attente de validation depuis plus de 3 jours. Suivi recommandé auprès de l'approbateur courant.`,
      entityType: "AdminRequestValidationRun",
      entityId: run.id,
      // Déjà notifié directement par le cron (escalade/rappel aux
      // approbateurs) — l'agent agrège sans notifier une seconde fois.
    });
  }
  for (const run of blockedTasks) {
    await recordInsight({
      agent: "ADMINISTRATIVE_ASSISTANT",
      type: "ALERTE",
      titre: `Validation de tâche bloquée : ${run.task.titre}`,
      contenu: `${run.task.titre} est en attente de validation depuis plus de 3 jours. Suivi recommandé auprès de l'approbateur courant.`,
      entityType: "TaskValidationRun",
      entityId: run.id,
    });
  }
}

/** AI Strategy Advisor — analyse les objectifs, mesure les écarts, propose des scénarios. */
async function runStrategyAdvisorAgent() {
  const objectives = await prisma.objective.findMany({
    where: { statut: "EN_COURS", dateFin: { lt: new Date() } },
    select: { id: true, titre: true, userId: true },
  });

  for (const o of objectives) {
    await recordInsight({
      agent: "STRATEGY_ADVISOR",
      type: "RECOMMANDATION",
      titre: `Objectif en écart : ${o.titre}`,
      contenu: `${o.titre} a dépassé son échéance sans être clôturé. Scénarios proposés : prolonger l'échéance si l'objectif reste pertinent, ou le clore en NON_ATTEINT et capitaliser sur les enseignements.`,
      entityType: "Objective",
      entityId: o.id,
      // Déjà notifié directement par le cron ("objectif en retard") —
      // l'agent agrège sans notifier une seconde fois.
    });
  }
}

export async function runDailyAiAgents() {
  await Promise.all([
    runProjectManagerAgent(),
    runCrmManagerAgent(),
    runRiskManagerAgent(),
    runAnalystAgent(),
    runAdministrativeAssistantAgent(),
    runStrategyAdvisorAgent(),
  ]);
}
