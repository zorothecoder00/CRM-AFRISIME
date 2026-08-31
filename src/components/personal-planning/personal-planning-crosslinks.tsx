import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/planning-personnel", label: "Planning personnel" },
  { href: "/ma-journee", label: "Ma journée" },
  { href: "/planning-personnel/bilans", label: "Historique des bilans" },
  { href: "/planning-personnel/missions", label: "Historique des missions" },
  { href: "/parametres/horaires", label: "Horaires de travail" },
] as const;

/** §44 — fil de liens croisés entre les pages du module, sans refonte de navigation. */
export function PersonalPlanningCrosslinks({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
      {LINKS.map((link, i) => (
        <span key={link.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/40">·</span>}
          {link.href === current ? (
            <span className="font-medium text-foreground">{link.label}</span>
          ) : (
            <Link href={link.href} className={cn("hover:text-foreground hover:underline")}>
              {link.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
