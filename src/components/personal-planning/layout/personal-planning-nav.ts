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
  Building2,
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
      { href: "/taches?from=planning-personnel", label: "Mes tâches", icon: ListChecks },
      { href: "/planning-personnel?vue=agenda", label: "Agenda", icon: LayoutList },
      { href: "/planning-personnel/recurrences", label: "Récurrences", icon: Repeat },
      { href: "/reunions?from=planning-personnel", label: "Réunions", icon: Users },
      { href: "/planning-personnel/missions", label: "Missions", icon: Briefcase },
      { href: "/objectifs?from=planning-personnel", label: "Mes objectifs", icon: Target },
      { href: "/charge-de-travail?from=planning-personnel", label: "Temps / Charge", icon: Clock3 },
      { href: "/notifications", label: "Alertes", icon: Bell, badgeKey: "alertes" },
      { href: "/ma-journee", label: "Ma performance", icon: BarChart3 },
      { href: "/parametres/profil?from=planning-personnel", label: "Paramètres", icon: Settings },
    ],
  },
  // Management (prototype V2) — montre les donnees d'AUTRES collaborateurs,
  // donc gardee derriere DASHBOARD_READ (meme permission que les pages
  // /pilotage vers lesquelles ces deux liens redirigent) et separee
  // visuellement du groupe personnel ci-dessus. Reutilise les pages
  // /pilotage deja existantes plutot que d'en rebatir une version reduite :
  // /planning-personnel/equipe route vers l'equipe dirigee par l'utilisateur
  // (redirection directe si une seule), /pilotage est le tableau de bord
  // organisation deja construit (§XXIII, niveaux Organisation -> Individu).
  {
    title: "Management",
    permission: PERMISSIONS.DASHBOARD_READ,
    items: [
      { href: "/planning-personnel/equipe", label: "Planning de mon équipe", icon: Users },
      { href: "/pilotage", label: "Niveaux de pilotage", icon: Building2 },
    ],
  },
];

export const PERSONAL_PLANNING_HOME_ITEM: PersonalPlanningNavItem = {
  href: "/dashboard",
  label: "Tableau de bord",
  icon: LayoutDashboard,
};
