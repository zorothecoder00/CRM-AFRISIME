import { prisma } from "@/lib/prisma";
import { stakeholderQuadrant } from "@/lib/status-tone";

// Communication Plan (Project Studio §36) — "construire automatiquement" a
// partir des parties prenantes deja qualifiees (§9 : influence/interet,
// voir stakeholderQuadrant) plutot que de partir d'une table vide. Chaque
// quadrant de la matrice suggere un canal/frequence de suivi differents ;
// reste ensuite editable/completable manuellement (voir communication-plan.actions.ts).
const SUGGESTIONS_BY_QUADRANT: Record<string, { message: string; canal: string; frequence: string }> = {
  "Gérer de près": { message: "Point d'avancement détaillé", canal: "Réunion individuelle", frequence: "Hebdomadaire" },
  Satisfaire: { message: "Synthèse des décisions et jalons clés", canal: "Rapport de synthèse", frequence: "Mensuelle" },
  Informer: { message: "Actualités et avancement général", canal: "Newsletter / e-mail", frequence: "Mensuelle" },
  Surveiller: { message: "Mise à jour générale", canal: "E-mail", frequence: "Trimestrielle" },
};

export type CommunicationPlanSuggestion = {
  stakeholderId: string;
  public: string;
  message: string;
  canal: string;
  frequence: string;
  responsableId: string | null;
};

/** Suggestions pour les parties prenantes du projet pas encore couvertes par une entree existante. */
export async function suggestCommunicationPlanEntries(projectId: string): Promise<CommunicationPlanSuggestion[]> {
  const [stakeholderLinks, existingEntries] = await Promise.all([
    prisma.stakeholderProject.findMany({
      where: { projectId },
      include: { stakeholder: true },
    }),
    prisma.communicationPlanEntry.findMany({ where: { projectId }, select: { stakeholderId: true } }),
  ]);

  const coveredStakeholderIds = new Set(existingEntries.map((e) => e.stakeholderId).filter((id): id is string => !!id));

  return stakeholderLinks
    .filter((link) => !coveredStakeholderIds.has(link.stakeholderId))
    .map((link) => {
      const quadrant = stakeholderQuadrant(link.stakeholder.influence, link.stakeholder.interet);
      const suggestion = SUGGESTIONS_BY_QUADRANT[quadrant] ?? SUGGESTIONS_BY_QUADRANT.Surveiller;
      return {
        stakeholderId: link.stakeholderId,
        public: link.stakeholder.nom,
        message: suggestion.message,
        canal: suggestion.canal,
        frequence: suggestion.frequence,
        responsableId: link.stakeholder.responsableId,
      };
    });
}
