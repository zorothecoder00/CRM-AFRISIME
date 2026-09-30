/**
 * Captures d'ecran du guide d'utilisation (public/guide/<id>.jpg) et
 * legendes de leurs reperes numerotes. Les reperes sont poses par
 * scripts/capture-guide-screenshots.ts, dans le meme ordre que `markers`
 * ci-dessous : modifier l'un impose de relancer le script.
 * Donnees affichees = comptes et donnees de demonstration locaux.
 */

export type GuideScreenshot = {
  title: string;
  caption: string;
  markers: string[];
};

export const GUIDE_SCREENSHOT_SIZE = { width: 1440, height: 900 };

export const GUIDE_SCREENSHOTS: Record<string, GuideScreenshot> = {
  connexion: {
    title: "Page de connexion",
    caption: "Première page affichée tant que vous n'êtes pas connecté.",
    markers: ["E-mail professionnel", "Mot de passe (l'œil permet de l'afficher)", "Mot de passe oublié : voir la procédure ci-dessous", "Se connecter"],
  },
  "espace-personnel": {
    title: "Espace personnel",
    caption: "Page d'accueil après connexion, ici pour un compte Collaborateur.",
    markers: [
      "« Pour vous » : raccourcis choisis selon votre rôle",
      "Raccourcis avec compteurs : demandes, messagerie, courrier, notifications",
      "Menu profil : paramètres, guide, déconnexion",
      "Briefing du jour et actions prioritaires",
    ],
  },
  taches: {
    title: "Liste des tâches",
    caption: "Les tâches d'un projet, filtrables et affichables de plusieurs façons.",
    markers: ["Filtres : projet, priorité, statut, période", "Changer de vue : Liste, Kanban, Gantt, Mind Map…", "Créer une tâche", "Statut et priorité modifiables directement dans la liste"],
  },
  "fiche-tache": {
    title: "Fiche d'une tâche en révision",
    caption: "Une tâche soumise à validation, vue par son premier approbateur.",
    markers: [
      "Statut de la tâche (ici « En révision »)",
      "Demander un report de l'échéance",
      "Circuit de validation : chaque étape et son état",
      "Approuver : passe à l'étape suivante, ou termine la tâche",
      "Refuser : la tâche revient à son créateur",
    ],
  },
  "fiche-projet": {
    title: "Fiche projet",
    caption: "En-tête et onglets d'un projet.",
    markers: ["Statut du projet, modifiable", "Supprimer : le projet part dans la corbeille", "Ouvrir Project Studio", "Les 18 onglets du projet"],
  },
  "project-studio": {
    title: "Project Studio",
    caption: "La boîte à outils méthodologique d'un projet, organisée en 8 familles.",
    markers: ["Les familles d'outils, de la conception à la capitalisation", "Outil ouvert (ici « Vues »)", "Les différents affichages des tâches du projet"],
  },
  "planning-personnel": {
    title: "Planning personnel",
    caption: "L'agenda de travail individuel, relié aux tâches.",
    markers: [
      "Demander un créneau à un collègue",
      "Ajouter une activité, ou capturer une idée en un clic",
      "Vues : semaine, jour, mois, agenda, liste, timeline",
      "Tâches sans créneau : à glisser dans la grille",
      "Bilan de fin de journée",
    ],
  },
  demande: {
    title: "Demande administrative",
    caption: "Détail d'une demande de recrutement et de son circuit de validation.",
    markers: ["Statut de la demande", "Circuit : qui doit valider, et où en est chaque étape"],
  },
  pipeline: {
    title: "Pipeline commercial",
    caption: "Les opportunités, colonne par étape. On les fait glisser d'une étape à l'autre.",
    markers: ["Une colonne par étape, avec le montant total", "Une opportunité : organisation, montant, responsable", "Créer une opportunité"],
  },
  "tableaux-de-bord": {
    title: "Tableaux de bord",
    caption: "Indicateurs clés de l'organisation, vus par la Direction.",
    markers: ["Recherche globale", "Choisir les widgets affichés", "Un widget : ici les tâches en retard"],
  },
  portail: {
    title: "Portail externe",
    caption: "Ce que voit un partenaire externe connecté à son portail.",
    markers: ["Menu du portail, adapté au profil du contact", "Uniquement les projets et opportunités qui le concernent", "Déconnexion"],
  },
};
