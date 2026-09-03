import Link from "next/link";
import { formatHours } from "@/lib/personal-planning-workload";
import { KpiCard, type KpiDelta } from "@/components/ui/kpi-card";
import type { CardAccent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PersonalPlanningStatsData = {
  tachesJour: number;
  tachesJourHier: number;
  tachesJourPlanifiees: number;
  enRetard: number;
  enRetardHier: number;
  aVenir: number;
  aVenirHier: number;
  reunions: number;
  reunionsHier: number;
  chargePercent: number;
  chargeHeures: number;
  capaciteHeures: number;
  planningHealth: number;
};

/**
 * Delta honnête entre aujourd'hui et hier — pas de table d'historique de
 * KPIs, donc uniquement calculable pour les métriques ré-interrogeables
 * telles quelles à J-1 (voir page.tsx). Omis (plutôt qu'inventé) quand la
 * base d'hier est à 0, où un pourcentage de variation n'a pas de sens.
 */
function dayDelta(today: number, yesterday: number, isPositiveGood = true): KpiDelta | undefined {
  if (yesterday === 0) return undefined;
  const value = Math.round(((today - yesterday) / yesterday) * 100);
  return { value, label: "vs hier", isPositiveGood };
}

/**
 * Rangée de 6 indicateurs en haut du hub — style aligné sur le prototype V2
 * (bordure d'accent colorée + ligne de delta) en réutilisant KpiCard, déjà
 * le langage visuel des KPI du reste de l'appli (tableau de bord).
 */
export function PersonalPlanningStats({ stats }: { stats: PersonalPlanningStatsData }) {
  const healthAccent: CardAccent = stats.planningHealth >= 80 ? "success" : stats.planningHealth >= 50 ? "warning" : "destructive";
  const chargeAccent: CardAccent = stats.chargePercent > 100 ? "destructive" : stats.chargePercent >= 80 ? "warning" : "success";
  // "Temps disponible" (demande utilisateur, remplace "À venir") — capacité
  // du jour restante, jamais négative (déjà l'heuristique de disponibiliteHeures
  // dans workload.ts, recalculée ici faute d'un champ dédié sur DailyCharge).
  const disponibleHeures = Math.max(0, Math.round((stats.capaciteHeures - stats.chargeHeures) * 10) / 10);
  const disponibleAccent: CardAccent = disponibleHeures <= 0 ? "destructive" : "info";

  // Toutes les cartes de la même forme (demande utilisateur) — les valeurs
  // n'ont pas la même longueur ("0" vs "24h / 7h"), donc chaque Card ne
  // remplissait que sa propre hauteur de contenu au lieu de la hauteur de
  // ligne déjà étirée par la grille (comportement par défaut d'un enfant
  // block, qui n'hérite pas de la hauteur stretchée sans h-full explicite).
  const cardClassName = "h-full";
  // Police à chiffres alignés (Geist Mono, déjà chargée par l'app) pour les
  // valeurs — plus lisible/soigné qu'un sans-serif proportionnel sur des
  // nombres (demande utilisateur, "un font plus joli").
  const valueClassName = "font-mono";

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      <Link href="/planning-personnel?vue=jour" className="block h-full">
        <KpiCard
          label="Mes tâches (jour)"
          value={stats.tachesJour}
          delta={dayDelta(stats.tachesJour, stats.tachesJourHier)}
          accent="primary"
          size="sm"
          compact
          className={cardClassName}
          valueClassName={valueClassName}
        />
      </Link>
      <Link href="/planning-personnel?vue=liste&enRetard=1" className="block h-full">
        <KpiCard
          label="En retard"
          value={stats.enRetard}
          delta={dayDelta(stats.enRetard, stats.enRetardHier, false)}
          accent={stats.enRetard > 0 ? "destructive" : "success"}
          size="sm"
          compact
          className={cardClassName}
          valueClassName={valueClassName}
        />
      </Link>
      <Link href="/planning-personnel/ma-journee" className="block h-full">
        <KpiCard
          label="Temps disponible"
          value={`${formatHours(disponibleHeures)}`}
          accent={disponibleAccent}
          size="sm"
          compact
          className={cardClassName}
          valueClassName={valueClassName}
        />
      </Link>
      <Link href="/planning-personnel?vue=jour&type=REUNION" className="block h-full">
        <KpiCard
          label="Réunions (jour)"
          value={stats.reunions}
          delta={dayDelta(stats.reunions, stats.reunionsHier)}
          accent="primary"
          size="sm"
          compact
          className={cardClassName}
          valueClassName={valueClassName}
        />
      </Link>
      <Link href="/planning-personnel/ma-journee" className="block h-full">
        <KpiCard
          label="Charge de travail"
          value={`${formatHours(stats.chargeHeures)} / ${formatHours(stats.capaciteHeures)}`}
          accent={chargeAccent}
          size="sm"
          compact
          className={cardClassName}
          valueClassName={cn(valueClassName, "text-lg")}
        />
      </Link>
      <Link href="/planning-personnel#planning-health" className="block h-full">
        <KpiCard
          label="Planning Health"
          value={`${stats.planningHealth}/100`}
          accent={healthAccent}
          size="sm"
          compact
          className={cardClassName}
          valueClassName={valueClassName}
        />
      </Link>
    </div>
  );
}
