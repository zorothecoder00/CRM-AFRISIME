/**
 * Donnees du guide d'utilisation (/guide) — documentation fonctionnelle
 * destinee aux non-developpeurs. Les niveaux d'acces refletent la matrice
 * DEFAULT_ROLE_PERMISSIONS de src/lib/permissions.ts (reglages par defaut,
 * modifiables depuis /administration/roles) : a resynchroniser a la main
 * si un module change de permission.
 */

export type GuideAccess = "tous" | "collab" | "mgr" | "resp" | "cp" | "cd" | "dir" | "dg" | "sa";

export const GUIDE_ACCESS: Record<
  GuideAccess,
  { label: string; variant: "success" | "info" | "violet" | "warning" | "default" }
> = {
  tous: { label: "Tous", variant: "success" },
  collab: { label: "Collaborateur +", variant: "info" },
  mgr: { label: "Manager +", variant: "info" },
  resp: { label: "Responsable +", variant: "info" },
  cp: { label: "Chef de projet +", variant: "violet" },
  cd: { label: "Chef de dép. +", variant: "violet" },
  dir: { label: "Direction", variant: "warning" },
  dg: { label: "DG / Admin", variant: "default" },
  sa: { label: "Super Admin", variant: "default" },
};

export type GuideGroupKey = "apercu" | "travail" | "collaboration" | "pilotage" | "crm" | "ia" | "admin" | "hors";

export const GUIDE_GROUPS: { key: GuideGroupKey; label: string; sub: string }[] = [
  { key: "apercu", label: "Aperçu", sub: "votre journée et vos vues d'ensemble" },
  { key: "travail", label: "Travail", sub: "planifier et exécuter" },
  { key: "collaboration", label: "Collaboration", sub: "se réunir et partager" },
  { key: "pilotage", label: "Pilotage", sub: "exporter et gérer" },
  { key: "crm", label: "CRM", sub: "les relations externes" },
  { key: "ia", label: "IA", sub: "analyses automatiques" },
  { key: "admin", label: "Administration", sub: "direction, organisation, gouvernance, paramétrage" },
  { key: "hors", label: "Hors menu", sub: "accessibles par la barre du haut, le menu profil ou un lien" },
];

export type GuideModule = {
  group: GuideGroupKey;
  name: string;
  href: string;
  access: GuideAccess;
  description: string;
  actions: string[];
  /** Ecran presente comme "IA" mais calcule de facon deterministe (aucune cle LLM). */
  heuristic?: boolean;
};

export const GUIDE_MODULES: GuideModule[] = [
  // Aperçu
  { group: "apercu", name: "Tableaux de bord", href: "/tableaux-de-bord", access: "mgr", description: "Indicateurs clés de l'organisation sous forme de widgets, avec une barre de recherche.", actions: ["Choisir et configurer ses widgets (bouton « Configurer »)", "8 widgets : charge, RH, performance par département, productivité, délais, avancement projets, temps passé, retards"] },
  { group: "apercu", name: "Espace personnel", href: "/dashboard", access: "tous", description: "Page d'accueil après connexion : tout ce qui vous concerne aujourd'hui.", actions: ["Briefing du jour et actions prioritaires", "Validations en attente, demandes, réunions, messages", "Calendrier 14 jours, projets, objectifs, activité de l'équipe"] },
  { group: "apercu", name: "Mon agenda", href: "/planning", access: "tous", description: "Vue jour par jour de ce qui est prévu pour vous.", actions: ["Naviguer de jour en jour"] },
  { group: "apercu", name: "Planning personnel", href: "/planning-personnel", access: "tous", description: "Agenda de travail détaillé, relié aux tâches (voir le chapitre dédié).", actions: ["Glisser-déposer des activités", "Planifier une tâche, capture rapide", "Fin de journée, partage d'agenda, demandes de créneau"] },
  { group: "apercu", name: "Horaires de travail", href: "/planning-personnel/parametres", access: "tous", description: "Vos heures de travail et vos préférences de rappels de planning.", actions: ["Définir début, fin, pauses", "Régler les notifications de planning"] },
  // Travail
  { group: "travail", name: "Planification", href: "/planification", access: "collab", description: "Cascade des plans : stratégique → annuel → trimestriel → mensuel, sous lesquels se rattachent objectifs et programmes.", actions: ["Créer un plan et ses sous-plans (Chef de dép. +)", "Ouvrir un plan pour voir ce qui s'y rattache"] },
  { group: "travail", name: "Programmes", href: "/programmes", access: "tous", description: "Regroupement de plusieurs projets sous une même initiative.", actions: ["Créer un programme (Chef de projet +)", "Suivre l'avancement consolidé de ses projets"] },
  { group: "travail", name: "Tâches", href: "/taches", access: "tous", description: "Toutes les tâches visibles, en 7 vues (liste, kanban, gantt…).", actions: ["Créer, assigner, filtrer", "Changer statut et priorité", "Ouvrir la fiche : checklist, sous-tâches, validation, dépendances"] },
  { group: "travail", name: "Portefeuille de projets", href: "/projets/portefeuille", access: "tous", description: "Point d'entrée unique : Projets, Project Studio, Laboratoire d'idées, Appels à projets.", actions: ["Créer un projet ou partir d'un modèle (Chef de projet +)", "Accès Control Tower, Roadmap, Calendrier, Carte"] },
  { group: "travail", name: "Équipes", href: "/administration/equipes", access: "cp", description: "Groupes de travail au sein d'un département, distincts de la hiérarchie.", actions: ["Créer une équipe, en gérer les membres", "Désigner un chef d'équipe", "Discussion d'équipe", "Supprimer une équipe (Chef de dép. +)"] },
  // Collaboration
  { group: "collaboration", name: "Réunions", href: "/reunions", access: "tous", description: "Planifier, conduire et tracer les réunions.", actions: ["Créer (Manager +), réunion récurrente", "Ordre du jour, compte rendu, décisions & actions", "Inviter des participants internes et externes"] },
  { group: "collaboration", name: "Calendrier", href: "/calendrier", access: "tous", description: "Vue consolidée : tâches, réunions, congés, missions, événements.", actions: ["Demander un congé", "Créer un événement (Manager +)"] },
  { group: "collaboration", name: "Documents", href: "/documents", access: "tous", description: "Gestion documentaire par dossiers, avec versions.", actions: ["Déposer un fichier (Collaborateur +)", "Nouvelle version, aperçu, téléchargement", "Gérer les dossiers (Chef de projet +)"] },
  // Pilotage
  { group: "pilotage", name: "Rapports", href: "/rapports", access: "mgr", description: "Exporter les données de la plateforme.", actions: ["Export PDF, Excel, Word ou présentation"] },
  { group: "pilotage", name: "Marketplace", href: "/marketplace", access: "tous", description: "Catalogue d'applications prévues pour étendre la plateforme à d'autres métiers.", actions: ["Consultation uniquement (rien d'installable pour l'instant)"] },
  { group: "pilotage", name: "Corbeille", href: "/corbeille", access: "cp", description: "Éléments supprimés, restaurables. Jamais de purge automatique.", actions: ["Restaurer un élément", "Supprimer définitivement (manuel)"] },
  // CRM
  { group: "crm", name: "Contacts", href: "/crm/contacts", access: "collab", description: "Carnet d'adresses des personnes externes (clients, partenaires, fournisseurs…).", actions: ["Créer un contact, enregistrer une interaction (Manager +)", "Fiche 360°, opportunités, relations", "Créer un accès portail"] },
  { group: "crm", name: "Organisations", href: "/crm/organisations", access: "collab", description: "Les organisations externes et leurs contacts.", actions: ["Créer une organisation", "Voir contacts, opportunités et contrats liés"] },
  // IA
  { group: "ia", name: "Agents IA", href: "/agents-ia", access: "mgr", description: "Analyses quotidiennes par agent spécialisé : retards, opportunités, risques, KPI, validations bloquées, écarts d'objectifs.", actions: ["Lire les constats du jour", "Ouvrir l'élément concerné"], heuristic: true },
  { group: "ia", name: "Orchestrateur d'agents", href: "/orchestrateur-ia", access: "mgr", description: "Un agent « stratégie » rassemble les résultats des agents projets, risques et ressources en une recommandation consolidée.", actions: ["Lancer une analyse consolidée"], heuristic: true },
  { group: "ia", name: "Strategy Copilot", href: "/copilot-strategique", access: "collab", description: "SWOT, priorités, OKR, feuille de route, analyse des écarts, construits à partir des axes et indicateurs existants.", actions: ["Générer une synthèse stratégique"], heuristic: true },
  { group: "ia", name: "Conseiller stratégique", href: "/conseiller-strategique", access: "collab", description: "Répond à des questions types à partir des données actuelles.", actions: ["Choisir une question, lire la réponse calculée"], heuristic: true },
  { group: "ia", name: "Prédictions", href: "/predictions", access: "mgr", description: "Estimation des risques de retard et des tendances à partir de l'historique.", actions: ["Voir les projets et tâches à risque"], heuristic: true },
  { group: "ia", name: "Gouvernance IA", href: "/gouvernance-ia", access: "dg", description: "File d'attente des actions automatiques qui demandent une validation humaine. Traçabilité complète.", actions: ["Approuver ou rejeter une action", "Régler le niveau : suggestion, validation, automatique"], heuristic: true },
  // Administration
  { group: "admin", name: "Centre de commande", href: "/centre-de-commande", access: "dg", description: "Vue instantanée réservée aux dirigeants.", actions: ["Repérer urgences, retards, décisions en attente"] },
  { group: "admin", name: "Executive Simulation Room", href: "/salle-de-simulation", access: "dg", description: "Situation actuelle, puis test de plusieurs scénarios comparés automatiquement.", actions: ["Créer et comparer des scénarios"] },
  { group: "admin", name: "Niveaux de pilotage", href: "/pilotage", access: "mgr", description: "Descente d'indicateurs : Organisation → Direction → Département → Service → Équipe → Projet → Individu.", actions: ["Cliquer un niveau pour descendre"] },
  { group: "admin", name: "Aperçu CRM", href: "/crm", access: "collab", description: "Vue d'ensemble des relations et du pipeline commercial.", actions: ["Chiffres clés CRM"] },
  { group: "admin", name: "Pipeline", href: "/crm/pipeline", access: "collab", description: "Opportunités en colonnes : Nouveau → Qualification → Proposition → Négociation → Gagnée / Perdue.", actions: ["Faire glisser une opportunité", "Créer une opportunité (Manager +)"] },
  { group: "admin", name: "Écosystème", href: "/ecosysteme", access: "collab", description: "Clients, fournisseurs, partenaires, investisseurs, bailleurs, consultants, communautés, chacun avec son espace.", actions: ["Voir les acteurs par catégorie"] },
  { group: "admin", name: "Partner Ecosystem Graph", href: "/graphe-partenaires", access: "collab", description: "Carte des liens organisation ↔ partenaires ↔ projets ↔ clients ↔ investisseurs.", actions: ["Explorer le graphe"] },
  { group: "admin", name: "Stratégie", href: "/strategie", access: "collab", description: "Vision, mission, valeurs et axes stratégiques.", actions: ["Rédiger la vision et les axes (Chef de dép. +)"] },
  { group: "admin", name: "Contribution OKR", href: "/contribution-okr", access: "collab", description: "Comment chaque projet et tâche sert la stratégie : Vision → Axe → Objectif → OKR → KPI → Projet → Tâches.", actions: ["Suivre la chaîne de contribution"] },
  { group: "admin", name: "Objectifs & KPI", href: "/objectifs", access: "tous", description: "Objectifs de l'organisation, d'un département, d'une équipe ou individuels, avec indicateurs.", actions: ["Créer un objectif (Collaborateur +)", "Mettre à jour un indicateur", "Périodes : annuel, trimestriel, mensuel, hebdo"] },
  { group: "admin", name: "Transformations", href: "/transformations", access: "collab", description: "Transformation digitale, restructuration, expansion, fusion, lancement d'activité, suivies en 6 phases.", actions: ["Créer une transformation", "Avancer de phase en phase"] },
  { group: "admin", name: "Feuille de route transformation", href: "/feuille-de-route-transformation", access: "mgr", description: "Proposition générée à partir du diagnostic de maturité : priorités immédiates, intermédiaires, avancées.", actions: ["Lire la feuille de route proposée"] },
  { group: "admin", name: "Maturité organisationnelle", href: "/maturite-organisationnelle", access: "mgr", description: "Évaluation sur 10 dimensions : stratégie, gouvernance, digitalisation, processus, collaboration, données, performance, innovation, IA, risques.", actions: ["Remplir le diagnostic", "Voir le score par dimension"] },
  { group: "admin", name: "Benchmarking", href: "/benchmarking", access: "mgr", description: "Comparer les performances dans le temps, entre équipes, entités et projets.", actions: ["Choisir les éléments à comparer"] },
  { group: "admin", name: "Charge de travail", href: "/charge-de-travail", access: "mgr", description: "Tâches, taux d'occupation, disponibilité, temps moyen, calculés automatiquement.", actions: ["Repérer surcharge et sous-charge", "Ajuster la capacité d'une personne"] },
  { group: "admin", name: "Workforce Planning", href: "/planification-effectifs", access: "mgr", description: "Besoins futurs, compétences critiques, postes à créer, projections, formation et recrutement.", actions: ["Projeter les besoins en effectif"] },
  { group: "admin", name: "Skills Intelligence", href: "/intelligence-competences", access: "mgr", description: "Compétences disponibles vs nécessaires vs futures, et action proposée par écart (formation, recrutement, mobilité…).", actions: ["Lire les écarts de compétences"] },
  { group: "admin", name: "Succession", href: "/succession", access: "mgr", description: "Postes critiques, profils de remplacement, plans de succession.", actions: ["Créer un plan de succession (Chef de dép. +)"] },
  { group: "admin", name: "Évaluations", href: "/evaluations", access: "collab", description: "Auto-évaluation, évaluation manager, 360° et évaluation projet.", actions: ["Mener et soumettre une évaluation (Responsable +)", "Consulter ses évaluations"] },
  { group: "admin", name: "Santé organisationnelle", href: "/sante-organisationnelle", access: "mgr", description: "Score 0-100 sur 9 dimensions pondérées, chacune expliquée.", actions: ["Lire le score et son détail", "Régler les poids des dimensions (DG / Admin)"] },
  { group: "admin", name: "Parties prenantes", href: "/parties-prenantes", access: "tous", description: "Un profil unique par personne ou organisation concernée, réutilisable sur plusieurs projets.", actions: ["Créer un profil", "Rattacher à un projet"] },
  { group: "admin", name: "Incidents", href: "/incidents", access: "tous", description: "Signalement et suivi des incidents terrain.", actions: ["Déclarer un incident", "Suivre son traitement"] },
  { group: "admin", name: "Base de connaissances", href: "/base-de-connaissances", access: "tous", description: "Wiki d'entreprise : procédures, guides, bonnes pratiques.", actions: ["Écrire un article (Collaborateur +)", "Publier, gérer les catégories"] },
  { group: "admin", name: "Graphe de connaissances", href: "/graphe-de-connaissances", access: "mgr", description: "Liens Personne → Projet → Processus → Document → Décision → Instance.", actions: ["Explorer les liens"] },
  { group: "admin", name: "Jumeau organisationnel", href: "/jumeau-organisationnel", access: "mgr", description: "Représentation numérique vivante de l'organisation : structure, humains, activités, ressources, performance.", actions: ["Parcourir le jumeau"] },
  { group: "admin", name: "Organizational Designer", href: "/organisation-virtuelle", access: "cd", description: "Concevoir une organisation virtuellement (directions, équipes, responsables…) et la simuler avant déploiement.", actions: ["Créer un brouillon organisationnel", "Le modifier, le simuler"] },
  { group: "admin", name: "Graphe organisationnel", href: "/graphe-organisationnel", access: "mgr", description: "Direction → Équipe → Prestataire → Projet → Objectif.", actions: ["Explorer les dépendances organisationnelles"] },
  { group: "admin", name: "Automatisations", href: "/automatisations", access: "mgr", description: "Règles « quand… si… alors… » (voir le chapitre sur les automatismes).", actions: ["Créer une règle (Chef de projet +)", "Activer, désactiver, voir l'historique"] },
  { group: "admin", name: "Orchestration", href: "/orchestration", access: "mgr", description: "Playbooks : un déclencheur, plusieurs actions dans l'ordre.", actions: ["Créer un playbook (Chef de projet +)"] },
  { group: "admin", name: "Dépendances", href: "/dependances", access: "tous", description: "Cartographie des dépendances entre projets, équipes, personnes et processus.", actions: ["Déclarer une dépendance", "Voir les dépendances à risque"] },
  { group: "admin", name: "Scénarios", href: "/scenarios", access: "mgr", description: "Estimer l'impact d'une hypothèse avant de décider, puis comparer plusieurs scénarios.", actions: ["Créer un scénario", "Comparer côte à côte"] },
  { group: "admin", name: "What-If Engine", href: "/what-if", access: "mgr", description: "Modifier effectif, budget, projets, délais, capacité, agences… et comparer à la situation actuelle.", actions: ["Ajuster les curseurs, lire l'écart"] },
  { group: "admin", name: "Consolidation Groupe", href: "/consolidation", access: "dg", description: "Vue Groupe → Pays → Société → Direction → Département → Projet → Tâche.", actions: ["Descendre par pays ou par entité"] },
  { group: "admin", name: "Mémoire organisationnelle", href: "/memoire-organisationnelle", access: "mgr", description: "Archive des décisions, projets, procédures et leçons passées.", actions: ["Rechercher dans l'historique", "Ajouter une entrée (Chef de projet +)"] },
  { group: "admin", name: "Matrices de décision", href: "/decisions", access: "mgr", description: "Comparer des options sur des critères pondérés et obtenir une recommandation calculée.", actions: ["Créer une matrice (Chef de projet +)"] },
  { group: "admin", name: "Decision Intelligence", href: "/intelligence-decisions", access: "mgr", description: "Historique des décisions et de leurs conséquences mesurées.", actions: ["Relire une décision et son effet"] },
  { group: "admin", name: "Gouvernance", href: "/gouvernance", access: "cp", description: "Instances (conseil, comité…), leurs réunions et leurs décisions.", actions: ["Créer une instance, une réunion, une décision (Direction)"] },
  { group: "admin", name: "Processus", href: "/processus", access: "mgr", description: "Processus de l'organisation, leurs étapes et leurs exécutions.", actions: ["Modéliser un processus (Chef de projet +)", "Suivre les exécutions"] },
  { group: "admin", name: "Risques", href: "/risques", access: "mgr", description: "Registre des risques : probabilité, impact, niveau, responsable, plan de traitement.", actions: ["Créer un risque (Chef de projet +)", "Filtrer par niveau"] },
  { group: "admin", name: "Audit interne", href: "/audit", access: "mgr", description: "Plans d'audit, missions et constats.", actions: ["Créer un plan, une mission, un constat (Chef de projet +)"] },
  { group: "admin", name: "Conformité", href: "/conformite", access: "cp", description: "Obligations réglementaires et contractuelles, contrôles, non-conformités.", actions: ["Enregistrer une obligation, un contrôle"] },
  { group: "admin", name: "Gouvernance des données", href: "/gouvernance-donnees", access: "dg", description: "Propriétaires, classification, sensibilité, qualité, conservation, archivage.", actions: ["Classer un jeu de données", "Régler la conservation"] },
  { group: "admin", name: "Sauvegarde & données", href: "/administration/donnees", access: "dg", description: "Export / import d'une sauvegarde complète, en complément des sauvegardes de l'hébergeur.", actions: ["Exporter une sauvegarde", "Importer une sauvegarde"] },
  { group: "admin", name: "Administration", href: "/administration/utilisateurs", access: "dg", description: "Le paramétrage de l'organisation.", actions: ["Utilisateurs : créer, désactiver, changer de rôle, lien de mot de passe", "Rôles & permissions, accès avancés", "Départements, organigramme, postes, sites, entités", "Circuits de validation, délégations", "Compétences, devises, profil de l'organisation", "Sécurité, journal d'audit, clés API, intégrations"] },
  { group: "admin", name: "Plateforme multi-organisation", href: "/administration/plateforme", access: "sa", description: "Registre des organisations clientes de la plateforme : marque et abonnement.", actions: ["Enregistrer une organisation"] },
  // Hors menu
  { group: "hors", name: "Demandes", href: "/demandes", access: "collab", description: "Demandes administratives : achat, mission, décaissement, matériel, autorisation, recrutement.", actions: ["Soumettre une demande", "Approuver ou refuser (Responsable +)"] },
  { group: "hors", name: "Messagerie", href: "/messages", access: "tous", description: "Conversations directes, de groupe, par projet et avec les contacts du portail.", actions: ["Nouvelle conversation, @mention"] },
  { group: "hors", name: "Courrier", href: "/courrier", access: "collab", description: "Registre du courrier entrant, sortant, interne.", actions: ["Enregistrer un courrier (Responsable +)", "Changer son statut"] },
  { group: "hors", name: "Notifications", href: "/notifications", access: "tous", description: "Toutes vos notifications, lues et non lues.", actions: ["Tout marquer comme lu", "Ouvrir l'élément concerné"] },
  { group: "hors", name: "Recherche", href: "/recherche", access: "tous", description: "Recherche globale dans toute la plateforme, tolérante aux fautes de frappe.", actions: ["Chercher personnes, projets, documents, décisions…"] },
  { group: "hors", name: "Assistant", href: "/assistant", access: "tous", description: "Assistant conversationnel à réponses calculées (pas un modèle d'IA).", actions: ["Poser une question sur ses tâches, projets…"], heuristic: true },
  { group: "hors", name: "Historique des congés", href: "/conges", access: "tous", description: "Vos demandes de congé et leur statut.", actions: ["Suivre l'état d'une demande"] },
  { group: "hors", name: "Mon profil", href: "/parametres/profil", access: "tous", description: "Vos informations personnelles et compétences.", actions: ["Modifier photo, coordonnées", "Déclarer ses compétences"] },
  { group: "hors", name: "Sécurité du compte", href: "/parametres/securite", access: "tous", description: "Mot de passe, double authentification, sessions ouvertes.", actions: ["Activer la double authentification", "Fermer une session à distance"] },
  { group: "hors", name: "Notifications (réglages)", href: "/parametres/notifications", access: "tous", description: "Activer les notifications push sur cet appareil.", actions: ["Activer / désactiver par appareil"] },
  { group: "hors", name: "Laboratoire d'idées", href: "/projets/idees", access: "tous", description: "De l'intuition au projet : Idée → À étudier → Faisabilité → Approuvée → En conception → Projet créé.", actions: ["Déposer une idée", "Convertir en projet"] },
  { group: "hors", name: "Appels à projets", href: "/projets/appels-a-projets", access: "tous", description: "Opportunités de financement suivies.", actions: ["Lier à un projet ou convertir en projet"] },
  { group: "hors", name: "Control Tower", href: "/projets/control-tower", access: "tous", description: "Tous les projets : planning, budget, risques, qualité, livrables, impact.", actions: ["Repérer les projets en difficulté"] },
  { group: "hors", name: "Roadmap, Calendrier, Carte", href: "/projets/roadmap", access: "tous", description: "Les projets sur une frise commune, dans un calendrier, ou sur une carte géographique.", actions: ["Changer de vue"] },
  { group: "hors", name: "Modèles de projet", href: "/projets/modeles", access: "tous", description: "Bibliothèque de projets types réutilisables.", actions: ["Créer un projet à partir d'un modèle"] },
  { group: "hors", name: "Portail externe", href: "/portail", access: "tous", description: "Espace des contacts externes, avec connexion séparée (voir le chapitre CRM et portail).", actions: ["Activer son accès, se connecter", "Projets, missions, réunions, messages"] },
];

export const GUIDE_CHAPTERS: { id: string; title: string }[] = [
  { id: "apercu", title: "En une minute" },
  { id: "concepts", title: "Les notions de base" },
  { id: "connexion", title: "Se connecter" },
  { id: "ecran", title: "Lire l'écran" },
  { id: "roles", title: "Rôles et droits" },
  { id: "taches", title: "La vie d'une tâche" },
  { id: "projets", title: "La vie d'un projet" },
  { id: "demandes", title: "Demandes et congés" },
  { id: "planning", title: "Mon planning personnel" },
  { id: "collab", title: "Réunions, documents, messages" },
  { id: "crm", title: "CRM et portail externe" },
  { id: "pilotage", title: "Pilotage et Direction" },
  { id: "auto", title: "Ce que l'app fait seule" },
  { id: "catalogue", title: "Catalogue des modules" },
  { id: "limites", title: "Limites actuelles" },
  { id: "glossaire", title: "Glossaire" },
  { id: "faq", title: "Questions fréquentes" },
];
