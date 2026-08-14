import { prisma } from "@/lib/prisma";

export type ProcessusAnalytics = {
  dureeMoyenneHeures: number | null;
  tempsParEtape: { etapeId: string; etapeNom: string; dureeMoyenneHeures: number | null; dossiersEnCours: number }[];
  goulotEtapeId: string | null;
  goulotEtapeNom: string | null;
  tauxErreurPct: number;
  tauxRejetPct: number;
  dossiersEnAttente: number;
  performancePct: number;
  totalExecutions: number;
};

/**
 * Indicateurs d'analyse des processus (cahier des charges v2 §4.4), calculés
 * sur les ProcessusExecution/ProcessusExecutionEtape réels — pas de chiffres
 * simulés. "Taux d'erreur" = exécutions annulées en cours de route ; "taux de
 * rejet" = exécutions explicitement rejetées à une étape ; le goulot
 * d'étranglement est l'étape au temps moyen de passage le plus élevé.
 */
export async function computeProcessusAnalytics(processusId: string): Promise<ProcessusAnalytics> {
  const [executions, etapes] = await Promise.all([
    prisma.processusExecution.findMany({
      where: { processusId },
      select: { id: true, statut: true, dateDebut: true, dateFin: true },
    }),
    prisma.processusEtape.findMany({
      where: { processusId },
      orderBy: { ordre: "asc" },
      select: {
        id: true,
        nom: true,
        historique: { select: { dateEntree: true, dateSortie: true } },
      },
    }),
  ]);

  const totalExecutions = executions.length;
  const closed = executions.filter((e) => e.statut !== "EN_COURS");
  const termine = executions.filter((e) => e.statut === "TERMINE");
  const rejete = executions.filter((e) => e.statut === "REJETE");
  const annule = executions.filter((e) => e.statut === "ANNULE");
  const dossiersEnAttente = executions.filter((e) => e.statut === "EN_COURS").length;

  const dureesCompletes = termine
    .filter((e) => e.dateFin)
    .map((e) => (e.dateFin!.getTime() - e.dateDebut.getTime()) / 3_600_000);
  const dureeMoyenneHeures = dureesCompletes.length
    ? round1(dureesCompletes.reduce((sum, d) => sum + d, 0) / dureesCompletes.length)
    : null;

  const tempsParEtape = etapes.map((etape) => {
    const passagesTermines = etape.historique.filter((h) => h.dateSortie);
    const durees = passagesTermines.map((h) => (h.dateSortie!.getTime() - h.dateEntree.getTime()) / 3_600_000);
    const dossiersEnCours = etape.historique.filter((h) => !h.dateSortie).length;
    return {
      etapeId: etape.id,
      etapeNom: etape.nom,
      dureeMoyenneHeures: durees.length ? round1(durees.reduce((sum, d) => sum + d, 0) / durees.length) : null,
      dossiersEnCours,
    };
  });

  const goulot = tempsParEtape
    .filter((e) => e.dureeMoyenneHeures !== null)
    .sort((a, b) => (b.dureeMoyenneHeures ?? 0) - (a.dureeMoyenneHeures ?? 0))[0];

  const closedCount = closed.length;
  const tauxErreurPct = closedCount ? round1((annule.length / closedCount) * 100) : 0;
  const tauxRejetPct = closedCount ? round1((rejete.length / closedCount) * 100) : 0;
  const performancePct = closedCount ? round1((termine.length / closedCount) * 100) : 0;

  return {
    dureeMoyenneHeures,
    tempsParEtape,
    goulotEtapeId: goulot?.etapeId ?? null,
    goulotEtapeNom: goulot?.etapeNom ?? null,
    tauxErreurPct,
    tauxRejetPct,
    dossiersEnAttente,
    performancePct,
    totalExecutions,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
