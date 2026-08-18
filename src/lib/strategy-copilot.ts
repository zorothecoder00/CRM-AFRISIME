import { prisma } from "@/lib/prisma";
import { computeObjectiveProgress } from "@/lib/objective-progress";

// Strategy Copilot (cahier des charges V3.0 §10) — synthese qui reutilise
// entierement les modules deja en place plutot que d'en recreer des
// versions dediees : StrategicAxis/Objective/Indicator pour OKR et
// priorites (deja construits pour /strategie et /objectifs), le calcul
// d'ecart partage avec le Conseiller strategique (§9) pour "suivi
// strategique"/"analyse des ecarts". Seule nouveaute de modele : SwotItem
// (aucun equivalent existant pour l'analyse SWOT).

export type SwotBoard = Record<"FORCE" | "FAIBLESSE" | "OPPORTUNITE" | "MENACE", { id: string; contenu: string }[]>;

export async function buildSwotBoard(): Promise<SwotBoard> {
  const items = await prisma.swotItem.findMany({ orderBy: { createdAt: "desc" } });
  const board: SwotBoard = { FORCE: [], FAIBLESSE: [], OPPORTUNITE: [], MENACE: [] };
  for (const item of items) {
    board[item.categorie].push({ id: item.id, contenu: item.contenu });
  }
  return board;
}

export type AxisPriority = { id: string; nom: string; priorite: string; objectifsCount: number; plansCount: number };

/** Identification des priorites (cahier §10) — classement des axes strategiques par priorite. */
export async function buildPriorities(): Promise<AxisPriority[]> {
  const PRIORITY_ORDER: Record<string, number> = { CRITIQUE: 4, HAUTE: 3, MOYENNE: 2, BASSE: 1 };
  const axes = await prisma.strategicAxis.findMany({
    include: { _count: { select: { objectives: true, plans: true } } },
  });
  return axes
    .map((a) => ({ id: a.id, nom: a.nom, priorite: a.priorite, objectifsCount: a._count.objectives, plansCount: a._count.plans }))
    .sort((a, b) => (PRIORITY_ORDER[b.priorite] ?? 0) - (PRIORITY_ORDER[a.priorite] ?? 0));
}

export type RoadmapEntry = { titre: string; type: "Objectif" | "Projet"; axeNom: string | null; dateDebut: Date; dateFin: Date };

/** Construction des feuilles de route (cahier §10) — chronologie objectifs/projets rattachés à un axe. */
export async function buildRoadmap(): Promise<RoadmapEntry[]> {
  const objectives = await prisma.objective.findMany({
    where: { axisId: { not: null } },
    select: { titre: true, dateDebut: true, dateFin: true, axis: { select: { nom: true } } },
  });

  return objectives
    .map((o) => ({ titre: o.titre, type: "Objectif" as const, axeNom: o.axis?.nom ?? null, dateDebut: o.dateDebut, dateFin: o.dateFin }))
    .sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime());
}

export type StrategicTracking = {
  totalObjectifs: number;
  atteints: number;
  enCours: number;
  nonAtteints: number;
  enRetard: number;
  parAxe: { axeNom: string; total: number; enRetard: number }[];
};

export type ObjectiveGap = { titre: string; axeNom: string | null; ecartPoints: number };

/** Suivi stratégique + analyse des écarts (cahier §10) — même heuristique que le Conseiller stratégique (§9). */
export async function buildTrackingAndGaps(): Promise<{ tracking: StrategicTracking; ecarts: ObjectiveGap[] }> {
  const objectives = await prisma.objective.findMany({
    select: {
      titre: true,
      statut: true,
      dateDebut: true,
      dateFin: true,
      axis: { select: { nom: true } },
      indicators: { select: { valeurCible: true, valeurActuelle: true } },
    },
  });

  const enCoursObjectives = objectives.filter((o) => o.statut === "EN_COURS");
  const gaps = enCoursObjectives
    .map((o) => {
      const { ecart } = computeObjectiveProgress({
        dateDebut: o.dateDebut,
        dateFin: o.dateFin,
        indicators: o.indicators.map((i) => ({ valeurCible: Number(i.valeurCible), valeurActuelle: Number(i.valeurActuelle) })),
      });
      return { titre: o.titre, axeNom: o.axis?.nom ?? null, ecart };
    })
    .filter((o) => o.ecart > 0.15)
    .sort((a, b) => b.ecart - a.ecart);

  const parAxeMap = new Map<string, { total: number; enRetard: number }>();
  for (const o of enCoursObjectives) {
    const axeNom = o.axis?.nom ?? "Sans axe";
    const entry = parAxeMap.get(axeNom) ?? { total: 0, enRetard: 0 };
    entry.total++;
    if (gaps.some((g) => g.axeNom === o.axis?.nom && g.titre === o.titre)) entry.enRetard++;
    parAxeMap.set(axeNom, entry);
  }

  return {
    tracking: {
      totalObjectifs: objectives.length,
      atteints: objectives.filter((o) => o.statut === "ATTEINT").length,
      enCours: enCoursObjectives.length,
      nonAtteints: objectives.filter((o) => o.statut === "NON_ATTEINT").length,
      enRetard: gaps.length,
      parAxe: Array.from(parAxeMap.entries()).map(([axeNom, v]) => ({ axeNom, ...v })),
    },
    ecarts: gaps.map((g) => ({ titre: g.titre, axeNom: g.axeNom, ecartPoints: Math.round(g.ecart * 100) })),
  };
}
