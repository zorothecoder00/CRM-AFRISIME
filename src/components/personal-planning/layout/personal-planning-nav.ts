import {
  LayoutDashboard,
  Home,
  CalendarDays,
  Inbox,
  ListChecks,
  LayoutList,
  Repeat,
  Users,
  Briefcase,
  Target,
  Clock3,
  Bell,
  BarChart3,
  Settings,
  Grid3x3,
  History,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";

export type PersonalPlanningNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clé du compteur à afficher en badge (résolu côté sidebar), s'il y en a un. */
  badgeKey?: "aPlanifier" | "alertes";
};

export type PersonalPlanningNavGroup = {
  title: string;
  items: PersonalPlanningNavItem[];
  /** Groupe visible uniquement si l'utilisateur a cette permission (ex. Management, qui montre les donnees d'autres collaborateurs). */
  permission?: string;
};

/**
 * Barre de navigation dédiée au module Planning personnel (remplace la
 * sidebar globale sur ces pages). Deux groupes : "Planning personnel"
 * (strictement scope a l'utilisateur — voir ContextualBackLink + le
 * filtrage personnalScope des pages /taches, /reunions, /objectifs,
 * /charge-de-travail) et "Management", qui montre les donnees d'AUTRES
 * collaborateurs et reste donc gardee derriere WORKLOAD_READ, separee
 * visuellement pour ne jamais se confondre avec les pages personnelles.
 */
export const PERSONAL_PLANNING_NAV_GROUPS: PersonalPlanningNavGroup[] = [
  {
    title: "Planning personnel",
    items: [
      { href: "/planning-personnel", label: "Ma journée", icon: Home },
      { href: "/planning-personnel/calendrier", label: "Calendrier", icon: CalendarDays },
      { href: "/planning-personnel/a-planifier", label: "À planifier", icon: Inbox, badgeKey: "aPlanifier" },
      // Anciennes activites/taches deja passees, avec un bouton "Replanifier"
      // — distinct de /bilans (revues de fin de journee) et /recurrences
      // (series a venir) — demande utilisateur.
      { href: "/planning-personnel/historique", label: "Historique de planification", icon: History },
      { href: "/planning-personnel/mes-taches", label: "Mes tâches", icon: ListChecks },
      { href: "/planning-personnel/agenda", label: "Agenda", icon: LayoutList },
      { href: "/planning-personnel/recurrences", label: "Récurrences", icon: Repeat },
      { href: "/planning-personnel/reunions", label: "Réunions", icon: Users },
      { href: "/planning-personnel/missions", label: "Missions", icon: Briefcase },
      { href: "/planning-personnel/objectifs", label: "Mes objectifs", icon: Target },
      { href: "/planning-personnel/charge-de-travail", label: "Temps / Charge", icon: Clock3 },
      { href: "/notifications", label: "Alertes", icon: Bell, badgeKey: "alertes" },
      { href: "/planning-personnel/performance", label: "Ma performance", icon: BarChart3 },
      // Absent auparavant de cette sidebar (seulement accessible via l'ancien
      // groupe de liens en haut de page, désormais retiré) — demande utilisateur.
      { href: "/planning-personnel/bilans", label: "Historique des bilans", icon: History },
      { href: "/planning-personnel/parametres", label: "Paramètres", icon: Settings },
    ],
  },
  // Management (prototype V2) — montre les donnees d'AUTRES collaborateurs,
  // donc gardee derriere DASHBOARD_READ, separee visuellement du groupe
  // personnel ci-dessus. "Planning de mon equipe" reutilise /pilotage/equipe
  // (deja existant) ; "Workforce Control" est la page dediee du prototype
  // (PAS "Niveaux de pilotage", absent du prototype).
  {
    title: "Management",
    permission: PERMISSIONS.DASHBOARD_READ,
    items: [
      { href: "/planning-personnel/equipe", label: "Planning de mon équipe", icon: Users },
      { href: "/planning-personnel/workforce-control", label: "Workforce Control", icon: Grid3x3 },
    ],
  },
];

export const PERSONAL_PLANNING_HOME_ITEM: PersonalPlanningNavItem = {
  href: "/dashboard",
  label: "Tableau de bord",
  icon: LayoutDashboard,
};
