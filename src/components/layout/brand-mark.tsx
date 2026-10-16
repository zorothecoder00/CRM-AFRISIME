import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marque compacte de la barre superieure (refonte « façon Jira ») : le logo
 * complet (/logo.png, fond sombre lumineux) ne tient pas lisiblement dans une
 * barre de 56px — il reste utilise sur les ecrans d'authentification.
 */
export function BrandMark({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-[4px] px-1.5 py-1 transition-colors hover:bg-hover",
        className
      )}
      aria-label="AfriSime Work Space — accueil"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-primary text-[13px] font-bold text-primary-foreground">
        A
      </span>
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[15px] font-semibold text-foreground">AfriSime</span>
        <span className="show-from-lg text-[13px] text-muted-foreground">Work Space</span>
      </span>
    </Link>
  );
}
