const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProjectPilotage = {
  avancement: number;
  budget: { montant: number | null; coutReel: number | null; depasse: boolean };
  delais: { statut: "a_jour" | "en_retard" | "sans_echeance"; joursRetard: number | null };
  charge: { tauxOccupationMoyen: number | null; membreCount: number };
  risques: { actifs: number; critiques: number; total: number };
  qualite: { tauxApprobation: number | null; approuves: number; rejetes: number };
  performance: { tauxRespectDelais: number | null; aTemps: number; enRetard: number; total: number };
  livrables: { valides: number; total: number; tauxCompletion: number | null };
};

/**
 * Indicateurs de pilotage projet (cahier des charges §VI). Delais/Qualite/
 * Performance/Risques/Livrables n'existent nulle part ailleurs sous forme
 * calculee : ce module en fixe une definition explicite et unique plutot
 * que de la laisser divergente entre plusieurs vues.
 * - Delais : le projet est en retard si sa dateFin est depassee alors qu'il
 *   est toujours EN_COURS (meme logique que l'alerte "Objectif en retard").
 * - Qualite : taux d'approbation des validations de taches du projet
 *   (APPROUVE / (APPROUVE + REJETE)) — le seul signal de "qualite du
 *   travail" deja present dans le modele de donnees.
 * - Performance : taux de taches terminees dans les delais (completedAt <=
 *   echeance), meme calcul que deadlineCompliance de dashboard-data.ts mais
 *   scope a un seul projet.
 * - Risques "critiques" : risque actif (statut hors MAITRISE/CLOS) dont la
 *   probabilite OU l'impact est au niveau le plus eleve.
 */
export function computeProjectPilotage(input: {
  project: { avancement: number; budget: number | null; coutReel: number | null; statut: string; dateFin: Date | null };
  tasks: { statut: string; echeance: Date | null; completedAt: Date | null }[];
  workload: { tauxOccupation: number }[];
  risks: { statut: string; probabilite: string; impact: string }[];
  deliverables: { statut: string }[];
  validationRuns: { statut: string }[];
  now?: Date;
}): ProjectPilotage {
  const now = input.now ?? new Date();
  const { project, tasks, workload, risks, deliverables, validationRuns } = input;

  const depasse = project.budget !== null && project.coutReel !== null && project.coutReel > project.budget;

  let delaisStatut: ProjectPilotage["delais"]["statut"] = "sans_echeance";
  let joursRetard: number | null = null;
  if (project.dateFin) {
    if (project.statut === "EN_COURS" && project.dateFin.getTime() < now.getTime()) {
      delaisStatut = "en_retard";
      joursRetard = Math.floor((now.getTime() - project.dateFin.getTime()) / MS_PER_DAY);
    } else {
      delaisStatut = "a_jour";
    }
  }

  const tauxOccupationMoyen =
    workload.length > 0
      ? Math.round(workload.reduce((sum, w) => sum + w.tauxOccupation, 0) / workload.length)
      : null;

  const activeRisks = risks.filter((r) => r.statut !== "MAITRISE" && r.statut !== "CLOS");
  const criticalRisks = activeRisks.filter((r) => r.probabilite === "ELEVEE" || r.impact === "ELEVE");

  const approuves = validationRuns.filter((r) => r.statut === "APPROUVE").length;
  const rejetes = validationRuns.filter((r) => r.statut === "REJETE").length;
  const qualiteTotal = approuves + rejetes;

  const completedWithDeadline = tasks.filter(
    (t) => t.statut === "TERMINEE" && t.completedAt !== null && t.echeance !== null
  );
  const aTemps = completedWithDeadline.filter((t) => t.completedAt!.getTime() <= t.echeance!.getTime()).length;
  const perfTotal = completedWithDeadline.length;

  const valides = deliverables.filter((d) => d.statut === "VALIDE").length;

  return {
    avancement: project.avancement,
    budget: { montant: project.budget, coutReel: project.coutReel, depasse },
    delais: { statut: delaisStatut, joursRetard },
    charge: { tauxOccupationMoyen, membreCount: workload.length },
    risques: { actifs: activeRisks.length, critiques: criticalRisks.length, total: risks.length },
    qualite: { tauxApprobation: qualiteTotal > 0 ? Math.round((approuves / qualiteTotal) * 100) : null, approuves, rejetes },
    performance: {
      tauxRespectDelais: perfTotal > 0 ? Math.round((aTemps / perfTotal) * 100) : null,
      aTemps,
      enRetard: perfTotal - aTemps,
      total: perfTotal,
    },
    livrables: { valides, total: deliverables.length, tauxCompletion: deliverables.length > 0 ? Math.round((valides / deliverables.length) * 100) : null },
  };
}
