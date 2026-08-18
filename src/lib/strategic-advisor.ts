import { prisma } from "@/lib/prisma";
import { computeCriticite } from "@/lib/risk-matrix";
import { computeWorkload } from "@/lib/workload";
import { computeObjectiveProgress, timeElapsedRatio } from "@/lib/objective-progress";

const CRITICITE_WEIGHT: Record<string, number> = { FAIBLE: 1, MODERE: 2, IMPORTANT: 3, ELEVE: 4, CRITIQUE: 5 };
const PRIORITE_WEIGHT: Record<string, number> = { BASSE: 1, MOYENNE: 2, HAUTE: 3, CRITIQUE: 4 };
const RESSOURCES_SEUIL_FRAGILE = 2;

// Conseiller stratégique IA (cahier des charges V3.0 §9) — sans clé LLM
// disponible (voir memoire projet), les 5 questions listées par le cahier
// sont répondues par des requêtes/heuristiques sur les données réelles,
// même principe que les AiAgentInsight déjà en place (src/lib/ai-agents.ts)
// plutôt qu'un vrai raisonnement en langage naturel.
export type AdvisorAnswer = { question: string; reponse: string; details: string[] };

async function topRisquesStrategiques(): Promise<AdvisorAnswer> {
  const [orgRisks, projectRisks] = await Promise.all([
    prisma.organizationalRisk.findMany({
      where: { statut: { not: "CLOS" } },
      select: { titre: true, criticite: true },
    }),
    prisma.projectRisk.findMany({
      where: { statut: { not: "CLOS" } },
      select: { titre: true, probabilite: true, impact: true, project: { select: { nom: true } } },
    }),
  ]);

  const ranked = [
    ...orgRisks.map((r) => ({ label: r.titre, weight: CRITICITE_WEIGHT[r.criticite] ?? 0 })),
    ...projectRisks.map((r) => ({
      label: `${r.titre} (${r.project.nom})`,
      weight: CRITICITE_WEIGHT[computeCriticite(r.probabilite, r.impact)] ?? 0,
    })),
  ]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return {
    question: "Quels sont nos trois principaux risques stratégiques ?",
    reponse: ranked.length > 0 ? ranked.map((r) => r.label).join(" · ") : "Aucun risque ouvert détecté.",
    details: ranked.map((r) => r.label),
  };
}

async function objectifsMoinsSusceptibles(): Promise<AdvisorAnswer> {
  const objectives = await prisma.objective.findMany({
    where: { statut: "EN_COURS" },
    select: {
      id: true,
      titre: true,
      dateDebut: true,
      dateFin: true,
      indicators: { select: { valeurCible: true, valeurActuelle: true } },
    },
  });

  const scored = objectives.map((o) => {
    const { ecart } = computeObjectiveProgress({
      dateDebut: o.dateDebut,
      dateFin: o.dateFin,
      indicators: o.indicators.map((i) => ({ valeurCible: Number(i.valeurCible), valeurActuelle: Number(i.valeurActuelle) })),
    });
    return { titre: o.titre, retard: ecart };
  });

  const worst = scored
    .filter((s) => s.retard > 0.15)
    .sort((a, b) => b.retard - a.retard)
    .slice(0, 5);

  return {
    question: "Quels objectifs sont les moins susceptibles d'être atteints ?",
    reponse:
      worst.length > 0
        ? worst.map((w) => `${w.titre} (${Math.round(w.retard * 100)} pts de retard estimé)`).join(" · ")
        : "Aucun objectif en retard significatif détecté.",
    details: worst.map((w) => w.titre),
  };
}

async function ouConcentrerRessources(): Promise<AdvisorAnswer> {
  const [users, tasks, leaves, projects] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        capaciteHebdomadaireHeures: true,
        role: { select: { label: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" }, select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
    prisma.project.findMany({
      where: { statut: "EN_COURS" },
      select: { nom: true, _count: { select: { resources: true } } },
    }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({
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
    leaves
  );

  const byDepartment = new Map<string, { total: number; surcharge: number }>();
  users.forEach((u, i) => {
    const dept = u.department?.name ?? "Sans département";
    const entry = byDepartment.get(dept) ?? { total: 0, surcharge: 0 };
    entry.total++;
    if (workload[i]?.enSurcharge) entry.surcharge++;
    byDepartment.set(dept, entry);
  });
  const departmentsEnTension = Array.from(byDepartment.entries())
    .filter(([, v]) => v.total > 0 && v.surcharge / v.total >= 0.4)
    .sort((a, b) => b[1].surcharge / b[1].total - a[1].surcharge / a[1].total)
    .slice(0, 3)
    .map(([name, v]) => `${name} (${v.surcharge}/${v.total} en surcharge)`);

  const projetsSousDotes = projects.filter((p) => p._count.resources <= RESSOURCES_SEUIL_FRAGILE).map((p) => p.nom);

  const details = [...departmentsEnTension, ...projetsSousDotes.map((p) => `Projet sous-doté : ${p}`)];

  return {
    question: "Où devons-nous concentrer nos ressources ?",
    reponse: details.length > 0 ? details.join(" · ") : "Charge et dotation actuelles ne révèlent pas de tension marquée.",
    details,
  };
}

async function projetPrioritaire(): Promise<AdvisorAnswer> {
  const projects = await prisma.project.findMany({
    where: { statut: "EN_COURS", deletedAt: null },
    select: {
      id: true,
      nom: true,
      priorite: true,
      avancement: true,
      dateDebut: true,
      dateFin: true,
      risks: { where: { statut: { not: "CLOS" } }, select: { id: true } },
      objectives: { select: { id: true } },
    },
  });

  const scored = projects.map((p) => {
    const retard =
      p.dateDebut && p.dateFin
        ? Math.max(0, timeElapsedRatio(p.dateDebut, p.dateFin) - p.avancement / 100)
        : 0;
    const score = (PRIORITE_WEIGHT[p.priorite] ?? 0) * 3 + p.risks.length * 2 + p.objectives.length * 1.5 + retard * 5;
    return { nom: p.nom, score };
  });

  const top = scored.sort((a, b) => b.score - a.score)[0];

  return {
    question: "Quel projet devrait être prioritaire ?",
    reponse: top ? top.nom : "Aucun projet actif à prioriser.",
    details: top ? [top.nom] : [],
  };
}

async function principalesFaiblesses(): Promise<AdvisorAnswer> {
  const [usersCount, users, tasks, leaves, risquesCritiques, objectifsEnRetard, tachesEnRetard] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capaciteHebdomadaireHeures: true, role: { select: { label: true } } },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: {
        statut: true,
        tempsEstimeHeures: true,
        tempsReelHeures: true,
        responsablePrincipalId: true,
        assignees: { select: { userId: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.leave.findMany({ where: { statut: "APPROUVE" }, select: { userId: true, dateDebut: true, dateFin: true, statut: true } }),
    prisma.organizationalRisk.count({ where: { statut: { not: "CLOS" }, criticite: { in: ["ELEVE", "CRITIQUE"] } } }),
    prisma.objective.count({ where: { statut: "NON_ATTEINT" } }),
    prisma.task.count({ where: { deletedAt: null, statut: { in: ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"] }, echeance: { lt: new Date() } } }),
  ]);

  const workload = computeWorkload(
    users.map((u) => ({
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
    leaves
  );
  const surchargeCount = workload.filter((w) => w.enSurcharge).length;
  const surchargePct = usersCount > 0 ? Math.round((surchargeCount / usersCount) * 100) : 0;

  const details: string[] = [];
  if (surchargePct >= 25) details.push(`${surchargePct}% des collaborateurs actifs en surcharge`);
  if (risquesCritiques > 0) details.push(`${risquesCritiques} risque(s) organisationnel(s) élevé(s)/critique(s) ouvert(s)`);
  if (objectifsEnRetard > 0) details.push(`${objectifsEnRetard} objectif(s) déjà classé(s) non atteint(s)`);
  if (tachesEnRetard > 0) details.push(`${tachesEnRetard} tâche(s) en retard sur leur échéance`);

  return {
    question: "Quelles sont les principales faiblesses de notre organisation ?",
    reponse: details.length > 0 ? details.join(" · ") : "Aucune faiblesse structurelle majeure détectée sur les indicateurs suivis.",
    details,
  };
}

export async function buildStrategicAdvisorAnswers(): Promise<AdvisorAnswer[]> {
  return Promise.all([
    topRisquesStrategiques(),
    objectifsMoinsSusceptibles(),
    ouConcentrerRessources(),
    projetPrioritaire(),
    principalesFaiblesses(),
  ]);
}
