import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de chargement commun à toutes les pages (app) — affiché dès le
 * clic (prefetché par Next.js) pendant que la page serveur se calcule, au
 * lieu de laisser l'écran figé sur l'ancienne page. La sidebar et la topbar
 * (layout) restent en place et interactives.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement de la page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
