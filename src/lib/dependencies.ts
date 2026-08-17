import { prisma } from "@/lib/prisma";
import { recordInsight } from "@/lib/ai-agents";

/**
 * Cartographie des dépendances (V2.2 §13) — modèle générique (voir
 * prisma/schema.prisma model Dependency). Convention : `source` DÉPEND DE
 * `target` ("Projet A dépend de Projet B" → sourceType/sourceId = A,
 * targetType/targetId = B). Ne remplace pas TaskDependency (dépendances
 * tâche-à-tâche, UI dédiée déjà en place) — ce modèle couvre les autres
 * paires d'entités.
 */
export async function getDependenciesFor(entityType: string, entityId: string) {
  const [upstream, downstream] = await Promise.all([
    // Ce que CETTE entité dépend (elle est source).
    prisma.dependency.findMany({ where: { sourceType: entityType, sourceId: entityId } }),
    // Ce qui dépend de CETTE entité (elle est cible).
    prisma.dependency.findMany({ where: { targetType: entityType, targetId: entityId } }),
  ]);
  return { upstream, downstream };
}

/**
 * Résout un libellé affichable pour des couples (type, id) hétérogènes —
 * le modèle Dependency ne porte que des chaînes, pas de FK typée.
 */
export async function resolveDependencyLabels(entities: { type: string; id: string }[]): Promise<Map<string, string>> {
  const idsByType = new Map<string, string[]>();
  for (const e of entities) {
    const arr = idsByType.get(e.type) ?? [];
    arr.push(e.id);
    idsByType.set(e.type, arr);
  }

  const labels = new Map<string, string>();

  if (idsByType.has("Project")) {
    const rows = await prisma.project.findMany({ where: { id: { in: idsByType.get("Project")! } }, select: { id: true, nom: true } });
    for (const r of rows) labels.set(`Project:${r.id}`, r.nom);
  }
  if (idsByType.has("Team")) {
    const rows = await prisma.team.findMany({ where: { id: { in: idsByType.get("Team")! } }, select: { id: true, nom: true } });
    for (const r of rows) labels.set(`Team:${r.id}`, r.nom);
  }
  if (idsByType.has("User")) {
    const rows = await prisma.user.findMany({ where: { id: { in: idsByType.get("User")! } }, select: { id: true, name: true } });
    for (const r of rows) labels.set(`User:${r.id}`, r.name);
  }
  if (idsByType.has("Processus")) {
    const rows = await prisma.processus.findMany({ where: { id: { in: idsByType.get("Processus")! } }, select: { id: true, nom: true } });
    for (const r of rows) labels.set(`Processus:${r.id}`, r.nom);
  }
  // Comble V2.2 §13 : "décisions", "ressources", "partenaires" absents du
  // sélecteur jusqu'ici alors que les modèles sous-jacents existaient déjà
  // (MeetingDecision/GovernanceDecision, ProjectResource, CrmOrganization).
  if (idsByType.has("MeetingDecision")) {
    const rows = await prisma.meetingDecision.findMany({ where: { id: { in: idsByType.get("MeetingDecision")! } }, select: { id: true, description: true } });
    for (const r of rows) labels.set(`MeetingDecision:${r.id}`, r.description);
  }
  if (idsByType.has("GovernanceDecision")) {
    const rows = await prisma.governanceDecision.findMany({ where: { id: { in: idsByType.get("GovernanceDecision")! } }, select: { id: true, objet: true } });
    for (const r of rows) labels.set(`GovernanceDecision:${r.id}`, r.objet);
  }
  if (idsByType.has("ProjectResource")) {
    const rows = await prisma.projectResource.findMany({ where: { id: { in: idsByType.get("ProjectResource")! } }, select: { id: true, nom: true } });
    for (const r of rows) labels.set(`ProjectResource:${r.id}`, r.nom);
  }
  if (idsByType.has("CrmOrganization")) {
    const rows = await prisma.crmOrganization.findMany({ where: { id: { in: idsByType.get("CrmOrganization")! } }, select: { id: true, nom: true } });
    for (const r of rows) labels.set(`CrmOrganization:${r.id}`, r.nom);
  }

  return labels;
}

export type DependencyRisk = { atRisk: boolean; message: string | null };

/**
 * Détection automatique de risque — implémentée pour le seul cas détaillé
 * par le cahier des charges (Projet dépend de Projet). Le modèle reste
 * ouvert aux autres paires de types ; leur détection de risque spécifique
 * reste à écrire au cas par cas plus tard.
 */
export async function checkDependencyRisk(dependency: {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
}): Promise<DependencyRisk> {
  if (dependency.sourceType !== "Project" || dependency.targetType !== "Project") {
    return { atRisk: false, message: null };
  }

  const [source, target] = await Promise.all([
    prisma.project.findUnique({ where: { id: dependency.sourceId }, select: { nom: true } }),
    prisma.project.findUnique({ where: { id: dependency.targetId }, select: { nom: true, statut: true, dateFin: true } }),
  ]);
  if (!source || !target) return { atRisk: false, message: null };

  const targetEnRetard = target.statut === "EN_COURS" && target.dateFin !== null && target.dateFin.getTime() < Date.now();
  const targetStoppe = target.statut === "EN_PAUSE" || target.statut === "ANNULE";
  if (!targetEnRetard && !targetStoppe) return { atRisk: false, message: null };

  return {
    atRisk: true,
    message: targetEnRetard
      ? `⚠️ Tout retard du projet ${target.nom} risque d'impacter le projet ${source.nom}.`
      : `⚠️ Le projet ${target.nom} est ${target.statut === "ANNULE" ? "annulé" : "en pause"} : le projet ${source.nom}, qui en dépend, risque d'être impacté.`,
  };
}

/**
 * Cron quotidien — pour chaque dépendance Projet→Projet à risque, écrit un
 * AiAgentInsight sur l'agent PROJECT_MANAGER (déjà en place, "surveille les
 * projets, détecte les retards" couvre naturellement ce cas) plutôt qu'un
 * nouveau canal d'alerte dédié.
 */
export async function runDependencyRiskChecks() {
  const dependencies = await prisma.dependency.findMany({
    where: { sourceType: "Project", targetType: "Project" },
  });

  for (const dep of dependencies) {
    const risk = await checkDependencyRisk(dep);
    if (!risk.atRisk || !risk.message) continue;

    const sourceProject = await prisma.project.findUnique({
      where: { id: dep.sourceId },
      select: { responsableId: true },
    });

    await recordInsight({
      agent: "PROJECT_MANAGER",
      type: "ALERTE",
      titre: "Dépendance inter-projets à risque",
      contenu: risk.message,
      entityType: "Dependency",
      entityId: dep.id,
      notifyUserId: sourceProject?.responsableId,
    });
  }
}
