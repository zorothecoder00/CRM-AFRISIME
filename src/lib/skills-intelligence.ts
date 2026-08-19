import { prisma } from "@/lib/prisma";
import type { OrgDesignNode } from "@/lib/org-designer";

// Skills Intelligence (cahier des charges V3.0 §23) — compare compétences
// disponibles (UserCompetence, pondérées par niveau) vs nécessaires (tâches
// actives requérant la compétence) vs futures (brouillons Organizational
// Designer simulés/déployés, §21), puis propose une action par écart.

const NIVEAU_WEIGHT: Record<string, number> = { DEBUTANT: 1, INTERMEDIAIRE: 2, AVANCE: 3, EXPERT: 4 };
const ACTIVE_TASK_STATUSES = ["A_FAIRE", "EN_COURS", "EN_REVISION", "BLOQUEE"] as const;

export type SkillsGapRecommendation =
  | "FORMATION"
  | "RECRUTEMENT"
  | "MOBILITE_INTERNE"
  | "SOUS_TRAITANCE"
  | "REALLOCATION"
  | "AUCUNE";

export type SkillGap = {
  competence: string;
  disponible: number;
  necessaire: number;
  future: number;
  ecart: number;
  utilisateursDisponibles: number;
  prestatairesDisponibles: number;
  recommandation: SkillsGapRecommendation;
};

function recommend(gap: number, disponible: number, prestatairesDisponibles: number): SkillsGapRecommendation {
  if (gap <= 0) return disponible > 0 ? "AUCUNE" : "AUCUNE";
  // Petit écart avec de la compétence déjà présente en interne : renforcer par formation.
  if (disponible > 0 && gap <= disponible) return "FORMATION";
  // Aucune compétence en interne mais un prestataire CRM la couvre déjà : sous-traitance.
  if (disponible === 0 && prestatairesDisponibles > 0) return "SOUS_TRAITANCE";
  // Écart important sans base interne : recrutement.
  if (disponible === 0) return "RECRUTEMENT";
  // Base interne existante mais insuffisante même après formation : mobilité interne d'abord.
  return "MOBILITE_INTERNE";
}

export async function computeSkillsIntelligence(): Promise<SkillGap[]> {
  const [competences, tasks, prestataires, futureDrafts] = await Promise.all([
    prisma.competence.findMany({
      select: { nom: true, users: { select: { niveau: true } } },
    }),
    prisma.task.findMany({
      where: { statut: { in: [...ACTIVE_TASK_STATUSES] } },
      select: { competencesRequises: { select: { nom: true } } },
    }),
    prisma.crmContact.findMany({
      where: { type: "PRESTATAIRE" },
      select: { fonction: true, notes: true },
    }),
    prisma.orgDesignDraft.findMany({
      where: { statut: { in: ["SIMULE", "DEPLOYE"] } },
      select: { structure: true },
    }),
  ]);

  const necessaireByCompetence = new Map<string, number>();
  for (const task of tasks) {
    for (const c of task.competencesRequises) {
      necessaireByCompetence.set(c.nom, (necessaireByCompetence.get(c.nom) ?? 0) + 1);
    }
  }

  const futureByCompetence = new Map<string, number>();
  for (const draft of futureDrafts) {
    const structure = draft.structure as unknown as OrgDesignNode;
    collectFutureCompetences(structure, futureByCompetence);
  }

  const prestataireText = prestataires.map((p) => `${p.fonction ?? ""} ${p.notes ?? ""}`.toLowerCase());

  const allNames = new Set<string>([
    ...competences.map((c) => c.nom),
    ...necessaireByCompetence.keys(),
    ...futureByCompetence.keys(),
  ]);

  const gaps: SkillGap[] = [];
  for (const nom of allNames) {
    const competence = competences.find((c) => c.nom === nom);
    const disponible = competence
      ? competence.users.reduce((sum, u) => sum + (NIVEAU_WEIGHT[u.niveau] ?? 0), 0)
      : 0;
    const utilisateursDisponibles = competence?.users.length ?? 0;
    const necessaire = necessaireByCompetence.get(nom) ?? 0;
    const future = futureByCompetence.get(nom) ?? 0;
    const ecart = Math.max(0, necessaire + future - disponible);
    const prestatairesDisponibles = prestataireText.filter((t) => t.includes(nom.toLowerCase())).length;

    gaps.push({
      competence: nom,
      disponible,
      necessaire,
      future,
      ecart,
      utilisateursDisponibles,
      prestatairesDisponibles,
      recommandation: recommend(ecart, disponible, prestatairesDisponibles),
    });
  }

  return gaps.sort((a, b) => b.ecart - a.ecart);
}

function collectFutureCompetences(node: OrgDesignNode, acc: Map<string, number>) {
  for (const equipe of node.equipes) {
    for (const c of equipe.competences) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      acc.set(trimmed, (acc.get(trimmed) ?? 0) + 1);
    }
  }
  for (const enfant of node.enfants) collectFutureCompetences(enfant, acc);
}
