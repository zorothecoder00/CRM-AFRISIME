/**
 * Agrégation des retours bénéficiaires/utilisateurs (cahier des charges
 * Project Studio §46) — extrait, pour un projet donné, les signaux
 * réutilisables par le suivi-évaluation (§47) : satisfaction moyenne et
 * plaintes ouvertes. Fonction pure, séparée de la page pour rester
 * appelable depuis le futur module M&E sans dupliquer le calcul.
 */
export function computeFeedbackSummary(
  feedbacks: { type: string; note: number | null; statut: string }[]
): {
  satisfactionMoyenne: number | null;
  satisfactionCount: number;
  plaintesOuvertes: number;
  plaintesTotal: number;
} {
  const notes = feedbacks
    .filter((f) => (f.type === "SATISFACTION" || f.type === "ENQUETE") && f.note !== null)
    .map((f) => f.note!);

  const plaintes = feedbacks.filter((f) => f.type === "PLAINTE");
  const plaintesOuvertes = plaintes.filter((f) => f.statut !== "TRAITE").length;

  return {
    satisfactionMoyenne: notes.length > 0 ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : null,
    satisfactionCount: notes.length,
    plaintesOuvertes,
    plaintesTotal: plaintes.length,
  };
}
