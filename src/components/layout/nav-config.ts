import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  CalendarClock,
  MessageSquare,
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
  { title: "Collaboration", href: "/collaboration", icon: MessageSquare, disabled: true },
  { title: "Performance", href: "/performance", icon: BarChart3, disabled: true },
  { title: "Administration", href: "/administration/utilisateurs", icon: ShieldCheck },
];
