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
  ShieldCheck,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
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
      { title: "Tableaux de bord", href: "/tableaux-de-bord", icon: LayoutGrid },
    ],
  },
  {
    label: "Travail",
    items: [
      { title: "Projets", href: "/projets", icon: FolderKanban },
      { title: "Tâches", href: "/taches", icon: ListChecks },
      { title: "Charge de travail", href: "/charge-de-travail", icon: Gauge },
      { title: "Objectifs & KPI", href: "/objectifs", icon: Target },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { title: "Réunions", href: "/reunions", icon: CalendarClock },
      { title: "Calendrier", href: "/calendrier", icon: CalendarDays },
      { title: "Documents", href: "/documents", icon: FileText },
      { title: "Messagerie", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { title: "Automatisations", href: "/automatisations", icon: Zap },
      { title: "Rapports", href: "/rapports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    items: [{ title: "Administration", href: "/administration/utilisateurs", icon: ShieldCheck }],
  },
];
