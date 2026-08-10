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
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Espace Personnel", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projets", href: "/projets", icon: FolderKanban },
  { title: "Tâches", href: "/taches", icon: ListChecks },
  { title: "Réunions", href: "/reunions", icon: CalendarClock },
  { title: "Calendrier", href: "/calendrier", icon: CalendarDays },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Objectifs & KPI", href: "/objectifs", icon: Target },
  { title: "Charge de travail", href: "/charge-de-travail", icon: Gauge },
  { title: "Messagerie", href: "/messages", icon: MessageSquare },
  { title: "Automatisations", href: "/automatisations", icon: Zap },
  { title: "Performance", href: "/performance", icon: BarChart3, disabled: true },
  { title: "Administration", href: "/administration/utilisateurs", icon: ShieldCheck },
];
