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
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  /** Absent = visible pour tout utilisateur connecté. Présent = masqué si la permission manque. */
  permission?: PermissionKey;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Regroupement par usage plutot qu'une liste plate de 13 items — sert de repere visuel dans la sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Aperçu",
    items: [
      { title: "Espace personnel", href: "/dashboard", icon: LayoutDashboard },
      { title: "Centre de commande", href: "/centre-de-commande", icon: Radar, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { title: "Executive Simulation Room", href: "/salle-de-simulation", icon: FlaskConical, permission: PERMISSIONS.EXECUTIVE_VIEW },
      { title: "Mon planning", href: "/planning", icon: CalendarRange },
      { title: "Tableaux de bord", href: "/tableaux-de-bord", icon: LayoutGrid, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Niveaux de pilotage", href: "/pilotage", icon: Network, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Recherche", href: "/recherche", icon: Search },
      { title: "Assistant", href: "/assistant", icon: Mic },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Aperçu CRM", href: "/crm", icon: Handshake, permission: PERMISSIONS.CRM_READ },
      { title: "Contacts", href: "/crm/contacts", icon: Users, permission: PERMISSIONS.CRM_READ },
      { title: "Organisations", href: "/crm/organisations", icon: Building2, permission: PERMISSIONS.CRM_READ },
      { title: "Pipeline", href: "/crm/pipeline", icon: Kanban, permission: PERMISSIONS.CRM_READ },
      { title: "Écosystème", href: "/ecosysteme", icon: Globe, permission: PERMISSIONS.CRM_READ },
    ],
  },
  {
    label: "Travail",
    items: [
      { title: "Stratégie", href: "/strategie", icon: Compass, permission: PERMISSIONS.PLAN_READ },
      { title: "Conseiller stratégique", href: "/conseiller-strategique", icon: MessageCircleQuestion, permission: PERMISSIONS.PLAN_READ },
      { title: "Strategy Copilot", href: "/copilot-strategique", icon: Sparkles, permission: PERMISSIONS.PLAN_READ },
      { title: "Contribution OKR", href: "/contribution-okr", icon: Target, permission: PERMISSIONS.PLAN_READ },
      { title: "Transformations", href: "/transformations", icon: Rocket, permission: PERMISSIONS.PLAN_READ },
      { title: "Planification", href: "/planification", icon: Milestone, permission: PERMISSIONS.PLAN_READ },
      { title: "Programmes", href: "/programmes", icon: Layers, permission: PERMISSIONS.PROGRAM_READ },
      { title: "Projets", href: "/projets", icon: FolderKanban, permission: PERMISSIONS.PROJECT_READ },
      { title: "Tâches", href: "/taches", icon: ListChecks, permission: PERMISSIONS.TASK_READ },
      { title: "Charge de travail", href: "/charge-de-travail", icon: Gauge, permission: PERMISSIONS.WORKLOAD_READ },
      { title: "Objectifs & KPI", href: "/objectifs", icon: Target, permission: PERMISSIONS.OBJECTIVE_READ },
      { title: "Évaluations", href: "/evaluations", icon: ClipboardCheck, permission: PERMISSIONS.EVALUATION_READ },
      { title: "Parties prenantes", href: "/parties-prenantes", icon: UserCog, permission: PERMISSIONS.PROJECT_READ },
      { title: "Incidents", href: "/incidents", icon: TriangleAlert },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { title: "Réunions", href: "/reunions", icon: CalendarClock, permission: PERMISSIONS.MEETING_READ },
      { title: "Calendrier", href: "/calendrier", icon: CalendarDays },
      { title: "Documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
      { title: "Base de connaissances", href: "/base-de-connaissances", icon: BookOpen, permission: PERMISSIONS.KNOWLEDGE_READ },
      { title: "Messagerie", href: "/messages", icon: MessageSquare, permission: PERMISSIONS.MESSAGE_READ },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { title: "Courrier", href: "/courrier", icon: Mail, permission: PERMISSIONS.COURRIER_READ },
      { title: "Demandes", href: "/demandes", icon: ClipboardList, permission: PERMISSIONS.ADMIN_REQUEST_READ },
      { title: "Automatisations", href: "/automatisations", icon: Zap, permission: PERMISSIONS.AUTOMATION_READ },
      { title: "Orchestration", href: "/orchestration", icon: Workflow, permission: PERMISSIONS.AUTOMATION_READ },
      { title: "Agents IA", href: "/agents-ia", icon: BrainCircuit, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Orchestrateur d'agents", href: "/orchestrateur-ia", icon: Combine, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Mémoire organisationnelle", href: "/memoire-organisationnelle", icon: Archive, permission: PERMISSIONS.MEMORY_READ },
      { title: "Prédictions", href: "/predictions", icon: TrendingUp, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Dépendances", href: "/dependances", icon: GitBranch, permission: PERMISSIONS.PROJECT_READ },
      { title: "Scénarios", href: "/scenarios", icon: FlaskConical, permission: PERMISSIONS.REPORT_EXPORT },
      { title: "What-If Engine", href: "/what-if", icon: SlidersHorizontal, permission: PERMISSIONS.REPORT_EXPORT },
      { title: "Rapports", href: "/rapports", icon: FileBarChart, permission: PERMISSIONS.REPORT_EXPORT },
      { title: "Consolidation Groupe", href: "/consolidation", icon: Globe2, permission: PERMISSIONS.ENTITY_VIEW_ALL },
      { title: "Benchmarking", href: "/benchmarking", icon: BarChart3, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Jumeau organisationnel", href: "/jumeau-organisationnel", icon: Boxes, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Organizational Designer", href: "/organisation-virtuelle", icon: Blocks, permission: PERMISSIONS.DEPARTMENT_MANAGE },
      { title: "Workforce Planning", href: "/planification-effectifs", icon: GraduationCap, permission: PERMISSIONS.WORKLOAD_READ },
      { title: "Skills Intelligence", href: "/intelligence-competences", icon: Lightbulb, permission: PERMISSIONS.WORKLOAD_READ },
      { title: "Succession", href: "/succession", icon: Repeat2, permission: PERMISSIONS.SUCCESSION_READ },
      { title: "Santé organisationnelle", href: "/sante-organisationnelle", icon: HeartPulse, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Graphe de connaissances", href: "/graphe-de-connaissances", icon: Share2, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Graphe organisationnel", href: "/graphe-organisationnel", icon: Waypoints, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Partner Ecosystem Graph", href: "/graphe-partenaires", icon: Link2, permission: PERMISSIONS.CRM_READ },
      { title: "Maturité organisationnelle", href: "/maturite-organisationnelle", icon: Gauge, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Feuille de route transformation", href: "/feuille-de-route-transformation", icon: Map, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Marketplace", href: "/marketplace", icon: Store },
      { title: "Corbeille", href: "/corbeille", icon: Trash2, permission: PERMISSIONS.TRASH_MANAGE },
      { title: "Sauvegarde & données", href: "/administration/donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
      { title: "Gouvernance des données", href: "/gouvernance-donnees", icon: Database, permission: PERMISSIONS.DATA_BACKUP_MANAGE },
      { title: "Matrices de décision", href: "/decisions", icon: Scale, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Decision Intelligence", href: "/intelligence-decisions", icon: History, permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Gouvernance IA", href: "/gouvernance-ia", icon: ShieldCheck, permission: PERMISSIONS.AI_GOVERNANCE_APPROVE },
    ],
  },
  {
    label: "Gouvernance & Risques",
    items: [
      { title: "Gouvernance", href: "/gouvernance", icon: Landmark, permission: PERMISSIONS.GOVERNANCE_READ },
      { title: "Processus", href: "/processus", icon: GitBranch, permission: PERMISSIONS.PROCESS_READ },
      { title: "Risques", href: "/risques", icon: ShieldAlert, permission: PERMISSIONS.RISK_READ },
      { title: "Conformité", href: "/conformite", icon: ShieldCheck, permission: PERMISSIONS.GOVERNANCE_READ },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Administration",
        href: "/administration/utilisateurs",
        icon: ShieldCheck,
        permission: PERMISSIONS.ADMINISTRATION_ACCESS,
      },
      {
        title: "Plateforme multi-organisation",
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
  DIRECTEUR_GENERAL: ["/strategie", "/tableaux-de-bord", "/risques", "/gouvernance", "/scenarios"],
  DIRECTEUR: ["/strategie", "/tableaux-de-bord", "/risques", "/gouvernance", "/scenarios"],
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
