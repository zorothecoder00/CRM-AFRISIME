import {
  LayoutDashboard,
  ListChecks,
  CalendarClock,
  CalendarDays,
  FileText,
  Target,
  Gauge,
  Zap,
  LayoutGrid,
  Network,
  ShieldCheck,
  FileBarChart,
  Handshake,
  Users,
  Users2,
  Building,
  Building2,
  Kanban,
  Layers,
  ClipboardCheck,
  CalendarRange,
  Milestone,
  BookOpen,
  Compass,
  Landmark,
  GitBranch,
  ShieldAlert,
  Workflow,
  BrainCircuit,
  TrendingUp,
  FlaskConical,
  UserCog,
  Globe2,
  BarChart3,
  Boxes,
  Share2,
  Waypoints,
  SlidersHorizontal,
  MessageCircleQuestion,
  Sparkles,
  HeartPulse,
  Rocket,
  Radar,
  Store,
  Trash2,
  Database,
  Scale,
  Combine,
  Archive,
  Blocks,
  GraduationCap,
  Lightbulb,
  Repeat2,
  Globe,
  Link2,
  Map,
  History,
  TriangleAlert,
  Briefcase,
  Lock,
  Clock,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export type NavItem = {
  /** Clé de traduction sous le namespace "nav.items" (messages/fr.json) — voir sidebar-nav.tsx. */
  titleKey: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  /** Absent = visible pour tout utilisateur connecté. Présent = masqué si la permission manque. */
  permission?: PermissionKey;
};

export type NavGroup = {
  /** Clé de traduction sous le namespace "nav.groups" (messages/fr.json). */
  labelKey: string;
  items: NavItem[];
};

/**
 * Entrees de premier niveau (refonte « façon Jira », 2026-10) : affichees
 * en tete de sidebar, hors de tout groupe — l'equivalent de « Pour vous /
 * Tableaux de bord » chez Jira. Les sections Recents et Favoris (voir
 * sidebar-nav.tsx) s'intercalent juste apres.
 */
export const NAV_PRIMARY: NavItem[] = [
  { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { titleKey: "tableauxDeBord", href: "/tableaux-de-bord", icon: LayoutGrid, permission: PERMISSIONS.DASHBOARD_READ },
  { titleKey: "planning", href: "/planning", icon: CalendarRange },
];

/**
 * Espaces de travail, regroupes par domaine metier comme les « projets »
 * de la sidebar Jira. L'ancien groupe « Administration » (~47 entrees en
 * vrac) est eclate en domaines lisibles ; seuls les trois premiers espaces
 * sont deplies par defaut (voir DEFAULT_OPEN_GROUPS).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "travail",
    items: [
      { titleKey: "taches", href: "/taches", icon: ListChecks, permission: PERMISSIONS.TASK_READ },
      // Regroupes en blocs dans /projets/portefeuille : Projets, Project
      // Studio, Laboratoire d'idees, Appel a projets.
      { titleKey: "portefeuilleProjets", href: "/projets/portefeuille", icon: Briefcase, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "planification", href: "/planification", icon: Milestone, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "programmes", href: "/programmes", icon: Layers, permission: PERMISSIONS.PROGRAM_READ },
      { titleKey: "planningPersonnel", href: "/planning-personnel", icon: Lock },
    ],
  },
  {
    labelKey: "crm",
    items: [
      { titleKey: "crm", href: "/crm", icon: Handshake, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmPipeline", href: "/crm/pipeline", icon: Kanban, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmContacts", href: "/crm/contacts", icon: Users, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmOrganisations", href: "/crm/organisations", icon: Building2, permission: PERMISSIONS.CRM_READ },
      { titleKey: "ecosysteme", href: "/ecosysteme", icon: Globe, permission: PERMISSIONS.CRM_READ },
      { titleKey: "graphePartenaires", href: "/graphe-partenaires", icon: Link2, permission: PERMISSIONS.CRM_READ },
    ],
  },
  {
    labelKey: "collaboration",
    items: [
      { titleKey: "reunions", href: "/reunions", icon: CalendarClock, permission: PERMISSIONS.MEETING_READ },
      { titleKey: "calendrier", href: "/calendrier", icon: CalendarDays },
      { titleKey: "documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
      { titleKey: "baseDeConnaissances", href: "/base-de-connaissances", icon: BookOpen, permission: PERMISSIONS.KNOWLEDGE_READ },
      { titleKey: "memoireOrganisationnelle", href: "/memoire-organisationnelle", icon: Archive, permission: PERMISSIONS.MEMORY_READ },
      { titleKey: "grapheDeConnaissances", href: "/graphe-de-connaissances", icon: Share2, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    labelKey: "strategie",
    items: [
      { titleKey: "strategie", href: "/strategie", icon: Compass, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "objectifs", href: "/objectifs", icon: Target, permission: PERMISSIONS.OBJECTIVE_READ },
      { titleKey: "contributionOkr", href: "/contribution-okr", icon: Target, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "centreDeCommande", href: "/centre-de-commande", icon: Radar, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { titleKey: "pilotage", href: "/pilotage", icon: Network, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "salleDeSimulation", href: "/salle-de-simulation", icon: FlaskConical, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { titleKey: "transformations", href: "/transformations", icon: Rocket, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "feuilleDeRouteTransformation", href: "/feuille-de-route-transformation", icon: Map, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "maturiteOrganisationnelle", href: "/maturite-organisationnelle", icon: Gauge, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "santeOrganisationnelle", href: "/sante-organisationnelle", icon: HeartPulse, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "benchmarking", href: "/benchmarking", icon: BarChart3, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    labelKey: "personnes",
    items: [
      { titleKey: "chargeDeTravail", href: "/charge-de-travail", icon: Gauge, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "evaluations", href: "/evaluations", icon: ClipboardCheck, permission: PERMISSIONS.EVALUATION_READ },
      { titleKey: "planificationEffectifs", href: "/planification-effectifs", icon: GraduationCap, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "intelligenceCompetences", href: "/intelligence-competences", icon: Lightbulb, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "succession", href: "/succession", icon: Repeat2, permission: PERMISSIONS.SUCCESSION_READ },
      { titleKey: "partiesPrenantes", href: "/parties-prenantes", icon: UserCog, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "equipes", href: "/administration/equipes", icon: Users2, permission: PERMISSIONS.TEAM_CREATE },
      { titleKey: "departements", href: "/administration/departements", icon: Building, permission: PERMISSIONS.DEPARTMENT_MANAGE },
      { titleKey: "organisationVirtuelle", href: "/organisation-virtuelle", icon: Blocks, permission: PERMISSIONS.DEPARTMENT_MANAGE },
      { titleKey: "grapheOrganisationnel", href: "/graphe-organisationnel", icon: Waypoints, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "jumeauOrganisationnel", href: "/jumeau-organisationnel", icon: Boxes, permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    labelKey: "gouvernanceRisques",
    items: [
      { titleKey: "risques", href: "/risques", icon: ShieldAlert, permission: PERMISSIONS.RISK_READ },
      { titleKey: "incidents", href: "/incidents", icon: TriangleAlert },
      { titleKey: "gouvernance", href: "/gouvernance", icon: Landmark, permission: PERMISSIONS.GOVERNANCE_READ },
      { titleKey: "processus", href: "/processus", icon: GitBranch, permission: PERMISSIONS.PROCESS_READ },
      { titleKey: "auditInterne", href: "/audit", icon: ClipboardCheck, permission: PERMISSIONS.AUDIT_READ },
      { titleKey: "conformite", href: "/conformite", icon: ShieldCheck, permission: PERMISSIONS.GOVERNANCE_READ },
      { titleKey: "decisions", href: "/decisions", icon: Scale, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "intelligenceDecisions", href: "/intelligence-decisions", icon: History, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "gouvernanceDonnees", href: "/gouvernance-donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
    ],
  },
  {
    labelKey: "analyse",
    items: [
      { titleKey: "rapports", href: "/rapports", icon: FileBarChart, permission: PERMISSIONS.REPORT_EXPORT },
      { titleKey: "consolidation", href: "/consolidation", icon: Globe2, permission: PERMISSIONS.ENTITY_VIEW_ALL },
      { titleKey: "dependances", href: "/dependances", icon: GitBranch, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "scenarios", href: "/scenarios", icon: FlaskConical, permission: PERMISSIONS.REPORT_EXPORT },
      { titleKey: "whatIf", href: "/what-if", icon: SlidersHorizontal, permission: PERMISSIONS.REPORT_EXPORT },
    ],
  },
  {
    // Pages explicitement presentees comme IA dans leur propre code
    // (heuristiques deterministes, pas de modele reel) + automatisations.
    labelKey: "ia",
    items: [
      { titleKey: "automatisations", href: "/automatisations", icon: Zap, permission: PERMISSIONS.AUTOMATION_READ },
      { titleKey: "orchestration", href: "/orchestration", icon: Workflow, permission: PERMISSIONS.AUTOMATION_READ },
      { titleKey: "agentsIa", href: "/agents-ia", icon: BrainCircuit, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "orchestrateurIa", href: "/orchestrateur-ia", icon: Combine, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "copilotStrategique", href: "/copilot-strategique", icon: Sparkles, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "conseillerStrategique", href: "/conseiller-strategique", icon: MessageCircleQuestion, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "predictions", href: "/predictions", icon: TrendingUp, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "gouvernanceIa", href: "/gouvernance-ia", icon: ShieldCheck, permission: PERMISSIONS.AI_GOVERNANCE_APPROVE },
    ],
  },
  {
    labelKey: "administration",
    items: [
      {
        titleKey: "administrationUtilisateurs",
        href: "/administration/utilisateurs",
        icon: ShieldCheck,
        permission: PERMISSIONS.ADMINISTRATION_ACCESS,
      },
      {
        titleKey: "administrationPlateforme",
        href: "/administration/plateforme",
        icon: Building2,
        permission: PERMISSIONS.PLATFORM_MANAGE,
      },
      { titleKey: "administrationDonnees", href: "/administration/donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
      { titleKey: "marketplace", href: "/marketplace", icon: Store },
      { titleKey: "corbeille", href: "/corbeille", icon: Trash2, permission: PERMISSIONS.TRASH_MANAGE },
      { titleKey: "horairesTravail", href: "/planning-personnel/parametres", icon: Clock },
      { titleKey: "guide", href: "/guide", icon: LifeBuoy },
    ],
  },
];

/** Espaces deplies tant que l'utilisateur n'a rien replie/deplie lui-meme. */
export const DEFAULT_OPEN_GROUPS = ["travail", "crm", "collaboration"];

/** Toutes les entrees navigables (premier niveau + espaces). */
export const ALL_NAV_ITEMS: NavItem[] = [...NAV_PRIMARY, ...NAV_GROUPS.flatMap((g) => g.items)];

/**
 * Entree de navigation correspondant a une URL (prefixe le plus long) —
 * sert au fil d'Ariane et a l'historique « Recents ». `groupKey` est absent
 * pour une entree de premier niveau.
 */
export function findNavLocation(pathname: string): { item: NavItem; groupKey?: string } | null {
  let best: { item: NavItem; groupKey?: string } | null = null;
  const consider = (item: NavItem, groupKey?: string) => {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.item.href.length) best = { item, groupKey };
    }
  };
  NAV_PRIMARY.forEach((item) => consider(item));
  NAV_GROUPS.forEach((g) => g.items.forEach((item) => consider(item, g.labelKey)));
  return best;
}

// Contextual UI (cahier des charges V3.0 §51) — "les menus peuvent
// s'adapter au contexte" : plutôt que de restructurer entièrement
// NAV_GROUPS par rôle (risque de régression sur une sidebar déjà utilisée
// par tous), une section "Pour vous" épinglée en tête reprend les items
// déjà existants les plus pertinents pour le rôle courant — les exemples
// du cahier (chef de projet, dirigeant) sont repris littéralement, les
// autres rôles extrapolés dans le même esprit.
export const CONTEXTUAL_NAV_BY_ROLE: Record<string, string[]> = {
  DIRECTEUR_GENERAL: ["/strategie", "/tableaux-de-bord", "/risques", "/decisions", "/scenarios"],
  DIRECTEUR: ["/strategie", "/tableaux-de-bord", "/risques", "/decisions", "/scenarios"],
  CHEF_DEPARTEMENT: ["/pilotage", "/charge-de-travail", "/objectifs", "/risques", "/planification"],
  CHEF_PROJET: ["/projets", "/taches", "/charge-de-travail", "/risques", "/planification"],
  RESPONSABLE: ["/projets", "/taches", "/charge-de-travail", "/reunions", "/objectifs"],
  MANAGER: ["/charge-de-travail", "/taches", "/reunions", "/objectifs", "/evaluations"],
  COLLABORATEUR: ["/dashboard", "/taches", "/planning", "/messages", "/objectifs"],
  CONSULTANT_EXTERNE: ["/taches", "/projets", "/messages", "/documents"],
  PRESTATAIRE: ["/taches", "/projets", "/messages"],
  INVITE: ["/projets", "/taches"],
};

export function getContextualNavItems(roleKey: string | undefined, permissions: string[]): NavItem[] {
  const hrefs = (roleKey && CONTEXTUAL_NAV_BY_ROLE[roleKey]) || [];
  return hrefs
    .map((href) => ALL_NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is NavItem => !!item && (!item.permission || permissions.includes(item.permission)));
}
