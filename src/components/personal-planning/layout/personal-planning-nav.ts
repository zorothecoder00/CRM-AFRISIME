import {
  LayoutDashboard,
  Home,
  CalendarDays,
  Inbox,
  ListChecks,
  CalendarClock,
  Users,
  Briefcase,
  Target,
  Clock3,
  Bell,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type PersonalPlanningNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clé du compteur à afficher en badge (résolu côté sidebar), s'il y en a un. */
  badgeKey?: "aPlanifier" | "alertes";
};

/** Barre de navigation dédiée au module Planning personnel (remplace la sidebar globale sur ces pages). */
export const PERSONAL_PLANNING_NAV: PersonalPlanningNavItem[] = [
  { href: "/planning-personnel", label: "Ma journée", icon: Home },
  { href: "/planning-personnel?vue=mois", label: "Calendrier", icon: CalendarDays },
  { href: "/planning-personnel#a-planifier", label: "À planifier", icon: Inbox, badgeKey: "aPlanifier" },
  { href: "/taches", label: "Mes tâches", icon: ListChecks },
  { href: "/planning-personnel?vue=agenda&type=RENDEZ_VOUS", label: "Rendez-vous", icon: CalendarClock },
  { href: "/reunions", label: "Réunions", icon: Users },
  { href: "/planning-personnel/missions", label: "Missions", icon: Briefcase },
  { href: "/objectifs", label: "Mes objectifs", icon: Target },
  { href: "/charge-de-travail", label: "Temps / Charge", icon: Clock3 },
  { href: "/notifications", label: "Alertes", icon: Bell, badgeKey: "alertes" },
  { href: "/ma-journee", label: "Ma performance", icon: BarChart3 },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export const PERSONAL_PLANNING_HOME_ITEM: PersonalPlanningNavItem = {
  href: "/dashboard",
  label: "Tableau de bord",
  icon: LayoutDashboard,
};
