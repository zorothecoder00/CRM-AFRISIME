import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  CalendarClock,
  CalendarDays,
  FileText,
  MessageSquare,
  Target,
  Gauge,
  Zap,
  LayoutGrid,
  Network,
  ShieldCheck,
  FileBarChart,
  Search,
  Handshake,
  Users,
  Building2,
  Kanban,
  Layers,
  ClipboardList,
  ClipboardCheck,
  CalendarRange,
  Milestone,
  BookOpen,
  Mail,
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
  Mic,
  TriangleAlert,
  Briefcase,
  HandCoins,
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

/** Regroupement par usage plutot qu'une liste plate de 13 items — sert de repere visuel dans la sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "apercu",
    items: [
      { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { titleKey: "centreDeCommande", href: "/centre-de-commande", icon: Radar, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { titleKey: "salleDeSimulation", href: "/salle-de-simulation", icon: FlaskConical, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { titleKey: "planning", href: "/planning", icon: CalendarRange },
      { titleKey: "tableauxDeBord", href: "/tableaux-de-bord", icon: LayoutGrid, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "pilotage", href: "/pilotage", icon: Network, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "recherche", href: "/recherche", icon: Search },
      { titleKey: "assistant", href: "/assistant", icon: Mic },
    ],
  },
  {
    labelKey: "crm",
    items: [
      { titleKey: "crm", href: "/crm", icon: Handshake, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmContacts", href: "/crm/contacts", icon: Users, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmOrganisations", href: "/crm/organisations", icon: Building2, permission: PERMISSIONS.CRM_READ },
      { titleKey: "crmPipeline", href: "/crm/pipeline", icon: Kanban, permission: PERMISSIONS.CRM_READ },
      { titleKey: "ecosysteme", href: "/ecosysteme", icon: Globe, permission: PERMISSIONS.CRM_READ },
    ],
  },
  {
    labelKey: "travail",
    items: [
      { titleKey: "strategie", href: "/strategie", icon: Compass, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "conseillerStrategique", href: "/conseiller-strategique", icon: MessageCircleQuestion, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "copilotStrategique", href: "/copilot-strategique", icon: Sparkles, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "contributionOkr", href: "/contribution-okr", icon: Target, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "transformations", href: "/transformations", icon: Rocket, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "planification", href: "/planification", icon: Milestone, permission: PERMISSIONS.PLAN_READ },
      { titleKey: "programmes", href: "/programmes", icon: Layers, permission: PERMISSIONS.PROGRAM_READ },
      { titleKey: "projets", href: "/projets", icon: FolderKanban, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "portefeuilleProjets", href: "/projets/portefeuille", icon: Briefcase, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "ideesProjets", href: "/projets/idees", icon: Lightbulb, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "appelsAProjets", href: "/projets/appels-a-projets", icon: HandCoins, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "taches", href: "/taches", icon: ListChecks, permission: PERMISSIONS.TASK_READ },
      { titleKey: "chargeDeTravail", href: "/charge-de-travail", icon: Gauge, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "objectifs", href: "/objectifs", icon: Target, permission: PERMISSIONS.OBJECTIVE_READ },
      { titleKey: "evaluations", href: "/evaluations", icon: ClipboardCheck, permission: PERMISSIONS.EVALUATION_READ },
      { titleKey: "partiesPrenantes", href: "/parties-prenantes", icon: UserCog, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "incidents", href: "/incidents", icon: TriangleAlert },
    ],
  },
  {
    labelKey: "collaboration",
    items: [
      { titleKey: "reunions", href: "/reunions", icon: CalendarClock, permission: PERMISSIONS.MEETING_READ },
      { titleKey: "calendrier", href: "/calendrier", icon: CalendarDays },
      { titleKey: "documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
      { titleKey: "baseDeConnaissances", href: "/base-de-connaissances", icon: BookOpen, permission: PERMISSIONS.KNOWLEDGE_READ },
      { titleKey: "messages", href: "/messages", icon: MessageSquare, permission: PERMISSIONS.MESSAGE_READ },
    ],
  },
  {
    labelKey: "pilotage",
    items: [
      { titleKey: "courrier", href: "/courrier", icon: Mail, permission: PERMISSIONS.COURRIER_READ },
      { titleKey: "demandes", href: "/demandes", icon: ClipboardList, permission: PERMISSIONS.ADMIN_REQUEST_READ },
      { titleKey: "automatisations", href: "/automatisations", icon: Zap, permission: PERMISSIONS.AUTOMATION_READ },
      { titleKey: "orchestration", href: "/orchestration", icon: Workflow, permission: PERMISSIONS.AUTOMATION_READ },
      { titleKey: "agentsIa", href: "/agents-ia", icon: BrainCircuit, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "orchestrateurIa", href: "/orchestrateur-ia", icon: Combine, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "memoireOrganisationnelle", href: "/memoire-organisationnelle", icon: Archive, permission: PERMISSIONS.MEMORY_READ },
      { titleKey: "predictions", href: "/predictions", icon: TrendingUp, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "dependances", href: "/dependances", icon: GitBranch, permission: PERMISSIONS.PROJECT_READ },
      { titleKey: "scenarios", href: "/scenarios", icon: FlaskConical, permission: PERMISSIONS.REPORT_EXPORT },
      { titleKey: "whatIf", href: "/what-if", icon: SlidersHorizontal, permission: PERMISSIONS.REPORT_EXPORT },
      { titleKey: "rapports", href: "/rapports", icon: FileBarChart, permission: PERMISSIONS.REPORT_EXPORT },
      { titleKey: "consolidation", href: "/consolidation", icon: Globe2, permission: PERMISSIONS.ENTITY_VIEW_ALL },
      { titleKey: "benchmarking", href: "/benchmarking", icon: BarChart3, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "jumeauOrganisationnel", href: "/jumeau-organisationnel", icon: Boxes, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "organisationVirtuelle", href: "/organisation-virtuelle", icon: Blocks, permission: PERMISSIONS.DEPARTMENT_MANAGE },
      { titleKey: "planificationEffectifs", href: "/planification-effectifs", icon: GraduationCap, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "intelligenceCompetences", href: "/intelligence-competences", icon: Lightbulb, permission: PERMISSIONS.WORKLOAD_READ },
      { titleKey: "succession", href: "/succession", icon: Repeat2, permission: PERMISSIONS.SUCCESSION_READ },
      { titleKey: "santeOrganisationnelle", href: "/sante-organisationnelle", icon: HeartPulse, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "grapheDeConnaissances", href: "/graphe-de-connaissances", icon: Share2, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "grapheOrganisationnel", href: "/graphe-organisationnel", icon: Waypoints, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "graphePartenaires", href: "/graphe-partenaires", icon: Link2, permission: PERMISSIONS.CRM_READ },
      { titleKey: "maturiteOrganisationnelle", href: "/maturite-organisationnelle", icon: Gauge, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "feuilleDeRouteTransformation", href: "/feuille-de-route-transformation", icon: Map, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "marketplace", href: "/marketplace", icon: Store },
      { titleKey: "corbeille", href: "/corbeille", icon: Trash2, permission: PERMISSIONS.TRASH_MANAGE },
      { titleKey: "administrationDonnees", href: "/administration/donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
      { titleKey: "gouvernanceDonnees", href: "/gouvernance-donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
      { titleKey: "decisions", href: "/decisions", icon: Scale, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "intelligenceDecisions", href: "/intelligence-decisions", icon: History, permission: PERMISSIONS.DASHBOARD_READ },
      { titleKey: "gouvernanceIa", href: "/gouvernance-ia", icon: ShieldCheck, permission: PERMISSIONS.AI_GOVERNANCE_APPROVE },
    ],
  },
  {
    labelKey: "gouvernanceRisques",
    items: [
      { titleKey: "gouvernance", href: "/gouvernance", icon: Landmark, permission: PERMISSIONS.GOVERNANCE_READ },
      { titleKey: "processus", href: "/processus", icon: GitBranch, permission: PERMISSIONS.PROCESS_READ },
      { titleKey: "risques", href: "/risques", icon: ShieldAlert, permission: PERMISSIONS.RISK_READ },
      { titleKey: "conformite", href: "/conformite", icon: ShieldCheck, permission: PERMISSIONS.GOVERNANCE_READ },
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
    ],
  },
];

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
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  return hrefs
    .map((href) => allItems.find((item) => item.href === href))
    .filter((item): item is NavItem => !!item && (!item.permission || permissions.includes(item.permission)));
}
