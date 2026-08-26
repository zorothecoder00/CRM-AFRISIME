/**
 * Catalogue du cahier des charges "Project Studio" (§1-68) — vue d'ensemble
 * lisible pour la page /projets/studio. Les tabs de la page projet
 * (`src/app/(app)/projets/[projectId]/page.tsx`) contiennent le detail;
 * ce fichier ne fait que documenter "quoi -> ou le trouver", volontairement
 * statique (pas de requete DB) car c'est un panorama, pas un tableau de
 * donnees live.
 */

export type CatalogLocation =
  | { type: "page"; href: string; label: string }
  | { type: "tab"; label: string }
  | { type: "concept" };

export type CatalogSection = {
  numero: number;
  titre: string;
  resume: string;
  location: CatalogLocation;
  statut: "livre" | "attente";
};

export type CatalogCategory = {
  nom: string;
  sections: CatalogSection[];
};

const page = (href: string, label: string): CatalogLocation => ({ type: "page", href, label });
const tab = (label: string): CatalogLocation => ({ type: "tab", label });
const concept: CatalogLocation = { type: "concept" };

export const PROJECT_STUDIO_CATALOG: CatalogCategory[] = [
  {
    nom: "Vision & architecture",
    sections: [
      { numero: 1, titre: "Vision du module", resume: "Cadrage conceptuel : de l'idée à l'impact, un seul module bout-en-bout.", location: concept, statut: "livre" },
      { numero: 2, titre: "Architecture générale", resume: "Carte cible du menu Projets en 27 rubriques — a inspiré l'organisation des onglets projet.", location: concept, statut: "livre" },
      { numero: 67, titre: "Architecture finale du module", resume: "Schéma Conception → Planification → Financement → Exécution → Monitoring → Évaluation → Impact.", location: concept, statut: "livre" },
      { numero: 68, titre: "Recommandations pour la V3", resume: "Note de cadrage stratégique — pas une fonctionnalité à livrer.", location: concept, statut: "livre" },
    ],
  },
  {
    nom: "Cadrage & idéation",
    sections: [
      { numero: 3, titre: "Portfolio Management", resume: "Vue portefeuille avec KPI et filtres (département, pays, bailleur, risque...).", location: page("/projets/portefeuille", "Portefeuille de projets"), statut: "livre" },
      { numero: 4, titre: "Idée de projet", resume: "Kanban des idées, conversion automatique en projet réel une fois en conception.", location: page("/projets/idees", "Idées & opportunités"), statut: "livre" },
      { numero: 5, titre: "Project Concept Note", resume: "Note de concept générée depuis l'idée, éditable avant conversion.", location: page("/projets/idees", "Idées & opportunités"), statut: "livre" },
    ],
  },
  {
    nom: "Diagnostic & conception",
    sections: [
      { numero: 6, titre: "Diagnostic du projet", resume: "Grille de diagnostic libre (un champ par outil du cahier des charges).", location: tab("Diagnostic"), statut: "livre" },
      { numero: 7, titre: "Problem Tree", resume: "Arbre à problèmes, réorganisable par glisser-déposer.", location: tab("Arbre des problèmes"), statut: "livre" },
      { numero: 8, titre: "Solution Tree", resume: "Arbre à solutions, généré en un clic depuis l'arbre à problèmes.", location: tab("Arbre des solutions"), statut: "livre" },
      { numero: 9, titre: "Stakeholder Analysis", resume: "Profils de parties prenantes réutilisables, matrice Influence × Intérêt en grille 2×2.", location: page("/parties-prenantes", "Parties prenantes"), statut: "livre" },
      { numero: 10, titre: "Beneficiary Analysis", resume: "Bénéficiaires : type, nombre, vulnérabilités, critères de sélection.", location: tab("Bénéficiaires"), statut: "livre" },
      { numero: 11, titre: "Theory of Change", resume: "Chaîne Impact → Outcomes → Outputs → Activités.", location: tab("Théorie du changement"), statut: "livre" },
      { numero: 12, titre: "Logframe Builder", resume: "Cadre logique généré depuis la théorie du changement.", location: tab("Cadre logique"), statut: "livre" },
      { numero: 13, titre: "Objectives Builder", resume: "Objectifs généraux / spécifiques / résultats, liés aux livrables.", location: tab("Objectifs"), statut: "livre" },
      { numero: 14, titre: "SMART Objectives", resume: "Score SMART (5 critères) calculé sur chaque objectif.", location: tab("Objectifs"), statut: "livre" },
    ],
  },
  {
    nom: "Planification",
    sections: [
      { numero: 15, titre: "Work Breakdown Structure (WBS)", resume: "Arborescence des sections, convertible en tâches/livrables/jalons.", location: tab("Hiérarchie"), statut: "livre" },
      { numero: 16, titre: "Project Charter", resume: "Charte de projet exportable (périmètre, contraintes, gouvernance, livrables).", location: tab("Charte"), statut: "livre" },
      { numero: 17, titre: "Scope Management", resume: "Périmètre inclus/exclu, contraintes, limites, critères de réussite.", location: tab("Périmètre"), statut: "livre" },
      { numero: 18, titre: "Gantt Builder", resume: "Dépendances 4 types (FS/SS/FF/SF) entre tâches.", location: tab("Gantt"), statut: "livre" },
      { numero: 19, titre: "Critical Path", resume: "Chemin critique calculé (passe avant/arrière, marge par tâche).", location: tab("Chemin critique"), statut: "livre" },
      { numero: 20, titre: "Resource Planning", resume: "Ressources affectées par activité, charge vs capacité de l'équipe.", location: tab("Ressources"), statut: "livre" },
      { numero: 21, titre: "RACI Matrix", resume: "Matrice rôle × activité, avec détection des incohérences R/A.", location: tab("RACI"), statut: "livre" },
    ],
  },
  {
    nom: "Budget & financement",
    sections: [
      { numero: 22, titre: "Budget Builder", resume: "Lignes budgétaires par catégorie, liées à la WBS.", location: tab("Budget"), statut: "livre" },
      { numero: 23, titre: "Budget par activité", resume: "Agrégation des coûts jusqu'à l'Output/Outcome/Impact.", location: tab("Budget"), statut: "livre" },
      { numero: 24, titre: "Financement du projet", resume: "Financements multiples par tranche/bailleur avec statut (identifié → approuvé).", location: tab("Financement"), statut: "livre" },
      { numero: 25, titre: "Donor / Bailleur Management", resume: "Convention, conditions, livrables et rapports exigés par bailleur.", location: tab("Financement"), statut: "livre" },
      { numero: 26, titre: "Appel à projets / Funding Opportunity", resume: "Pipeline d'opportunités de financement, liables à un projet.", location: page("/projets/appels-a-projets", "Appels à projets"), statut: "livre" },
      { numero: 27, titre: "Budget vs Réalisation", resume: "KPI budget total / engagé / payé / solde / taux d'exécution.", location: tab("Budget"), statut: "livre" },
    ],
  },
  {
    nom: "Risques, hypothèses, qualité & changements",
    sections: [
      { numero: 28, titre: "Risk Management", resume: "Registre des risques enrichi : catégorie, plan de mitigation et de contingence, matrice 3×3.", location: tab("Risques"), statut: "livre" },
      { numero: 29, titre: "Assumption Register", resume: "Registre des hypothèses, distinct du registre des risques.", location: tab("Hypothèses"), statut: "livre" },
      { numero: 30, titre: "Issue Management", resume: "Problèmes survenus, avec impact et action corrective.", location: tab("Problèmes"), statut: "livre" },
      { numero: 31, titre: "Change Request Management", resume: "Demandes de modification (budget/délai) avec impact calculé automatiquement.", location: tab("Modifications"), statut: "livre" },
      { numero: 32, titre: "Decision Register", resume: "Décisions de réunion enrichies d'un champ impact.", location: tab("Décisions"), statut: "livre" },
      { numero: 33, titre: "Quality Management", resume: "Quality Plan versionné, contrôles qualité et critères d'acceptation cochables.", location: tab("Qualité"), statut: "livre" },
    ],
  },
  {
    nom: "Achats, contrats & communication",
    sections: [
      { numero: 34, titre: "Procurement Plan", resume: "Achats liés à un fournisseur du référentiel CRM.", location: tab("Achats"), statut: "livre" },
      { numero: 35, titre: "Contract Management", resume: "Contrats fournisseurs/prestataires, livrables et paiements liés.", location: tab("Contrats"), statut: "livre" },
      { numero: 36, titre: "Communication Plan", resume: "Plan de communication suggéré automatiquement selon le quadrant de chaque partie prenante.", location: tab("Communication"), statut: "livre" },
      { numero: 37, titre: "Meeting Management", resume: "Réunions, comptes rendus et décisions — déjà présent avant le cahier des charges, confirmé complet.", location: tab("Réunions"), statut: "livre" },
      { numero: 38, titre: "Document Management", resume: "Dossiers standards générés automatiquement (Conception, Contrats, Budget...).", location: tab("Documents"), statut: "livre" },
      { numero: 39, titre: "Version Control", resume: "Historique de versions et statut de validation des documents.", location: tab("Documents"), statut: "livre" },
    ],
  },
  {
    nom: "Exécution & pilotage",
    sections: [
      { numero: 40, titre: "Project Execution", resume: "Tableau de bord d'exécution consolidant tâches, jalons, livrables, risques et budget.", location: tab("Exécution"), statut: "livre" },
      { numero: 41, titre: "Multiples vues", resume: "Bascule Kanban / Gantt / WBS / Théorie du changement sur un même projet.", location: tab("Vues"), statut: "livre" },
      { numero: 42, titre: "Project Control Tower", resume: "Vue de pilotage transverse sur l'ensemble du portefeuille de projets.", location: page("/projets/control-tower", "Control Tower"), statut: "livre" },
      { numero: 43, titre: "Earned Value Management (EVM)", resume: "PV / EV / AC, CPI, SPI et prévisions de fin.", location: tab("EVM"), statut: "livre" },
      { numero: 44, titre: "Milestone Management", resume: "Jalons avec validation et alerte d'échéance.", location: tab("Jalons"), statut: "livre" },
      { numero: 45, titre: "Deliverable Management", resume: "Livrables avec responsable, statut et validation.", location: tab("Livrables"), statut: "livre" },
    ],
  },
  {
    nom: "Suivi, évaluation & impact",
    sections: [
      { numero: 46, titre: "Beneficiary / User Feedback", resume: "Retours bénéficiaires/utilisateurs et signaux de satisfaction.", location: tab("Retours"), statut: "livre" },
      { numero: 47, titre: "Monitoring & Evaluation", resume: "Suivi indicateurs + évaluation sur les 5 critères OCDE-CAD (pertinence, efficacité...).", location: tab("Suivi-évaluation"), statut: "livre" },
      { numero: 48, titre: "Data Collection", resume: "Formulaires de collecte : bénéficiaire → collecte → indicateurs → dashboard.", location: tab("Collecte"), statut: "livre" },
      { numero: 49, titre: "Indicator Management", resume: "Chaque indicateur : définition, formule, baseline, cible, source, fréquence, désagrégation.", location: tab("KPI"), statut: "livre" },
      { numero: 50, titre: "Result Framework", resume: "Pyramide Impact → Outcomes → Outputs → Activités → Tâches avec progression par étage.", location: tab("Cadre de résultats"), statut: "livre" },
      { numero: 51, titre: "Évaluation du projet", resume: "Bilan final : objectifs atteints, effets, budget, délais, qualité, satisfaction.", location: tab("Bilan"), statut: "livre" },
    ],
  },
  {
    nom: "Clôture & capitalisation",
    sections: [
      { numero: 52, titre: "Project Closure", resume: "Checklist de clôture (9 items) distinguant \"sans objet\" de \"vérifié complet\".", location: tab("Clôture"), statut: "livre" },
      { numero: 53, titre: "Lessons Learned", resume: "Leçons apprises capitalisées à la fin du projet.", location: tab("Capitalisation"), statut: "livre" },
      { numero: 54, titre: "Project Post-Mortem", resume: "Comparaison Prévu vs Réalisé (délais, budget, périmètre).", location: tab("Bilan"), statut: "livre" },
      { numero: 55, titre: "Project Health Score", resume: "Score de santé synthétique du projet.", location: tab("Bilan"), statut: "livre" },
    ],
  },
  {
    nom: "Intelligence artificielle (en attente)",
    sections: [
      { numero: 56, titre: "AI Project Manager", resume: "Assistant IA de pilotage — nécessite une clé API LLM non configurée.", location: concept, statut: "attente" },
      { numero: 57, titre: "AI Project Designer", resume: "Génération assistée de la conception projet — nécessite une clé API LLM.", location: concept, statut: "attente" },
      { numero: 58, titre: "AI Risk Analyst", resume: "Analyse de risques assistée par IA — nécessite une clé API LLM.", location: concept, statut: "attente" },
      { numero: 59, titre: "AI Reporting", resume: "Génération de rapports assistée par IA — nécessite une clé API LLM.", location: concept, statut: "attente" },
    ],
  },
  {
    nom: "Fondations transverses",
    sections: [
      { numero: 60, titre: "Project Templates", resume: "Modèles de projet réutilisables (WBS, budget, indicateurs pré-remplis).", location: page("/projets/modeles", "Modèles"), statut: "livre" },
      { numero: 61, titre: "Project Methodology", resume: "Choix libre de méthodologie à la création (Agile, Waterfall, RBM, Cadre logique...).", location: tab("Aperçu"), statut: "livre" },
      { numero: 62, titre: "Project Governance", resume: "Sponsor, chef de projet, comité de pilotage, validateurs et partenaires structurés.", location: tab("Équipe"), statut: "livre" },
      { numero: 63, titre: "Project Workspace", resume: "Chaque projet a son propre espace complet — c'est la page projet elle-même, avec tous ses onglets.", location: concept, statut: "livre" },
      { numero: 64, titre: "Lien avec la théorie du changement", resume: "Théorie du changement, cadre logique et indicateurs reliés nativement (pas de silos).", location: tab("Théorie du changement"), statut: "livre" },
      { numero: 65, titre: "Source unique de vérité (SSOT)", resume: "La théorie du changement reste la source ; cadre logique et indicateurs se synchronisent en direct.", location: concept, statut: "livre" },
      { numero: 66, titre: "Automatisations entre modules", resume: "Règles déclenchées par les événements du projet (retard, création d'activité...).", location: tab("Automatisations"), statut: "livre" },
    ],
  },
];

export function catalogTotals() {
  const all = PROJECT_STUDIO_CATALOG.flatMap((c) => c.sections);
  return {
    total: all.length,
    livrees: all.filter((s) => s.statut === "livre").length,
    enAttente: all.filter((s) => s.statut === "attente").length,
  };
}
