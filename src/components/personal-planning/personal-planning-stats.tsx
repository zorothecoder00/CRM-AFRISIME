import Link from "next/link";
import { formatHours } from "@/lib/personal-planning-workload";
import { KpiCard, type KpiDelta } from "@/components/ui/kpi-card";
import type { CardAccent } from "@/components/ui/card";

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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Link href="/planning-personnel?vue=jour" className="block">
        <KpiCard
          label="Mes tâches (jour)"
          value={stats.tachesJour}
          delta={dayDelta(stats.tachesJour, stats.tachesJourHier)}
          accent="primary"
        />
      </Link>
      <Link href="/planning-personnel?vue=liste&enRetard=1" className="block">
        <KpiCard
          label="En retard"
          value={stats.enRetard}
          delta={dayDelta(stats.enRetard, stats.enRetardHier, false)}
          accent={stats.enRetard > 0 ? "destructive" : "success"}
        />
      </Link>
      <Link href="/planning-personnel?vue=liste&aVenir=1" className="block">
        <KpiCard
          label="À venir"
          value={stats.aVenir}
          delta={dayDelta(stats.aVenir, stats.aVenirHier)}
          accent="info"
        />
      </Link>
      <Link href="/planning-personnel?vue=jour&type=REUNION" className="block">
        <KpiCard
          label="Réunions (jour)"
          value={stats.reunions}
          delta={dayDelta(stats.reunions, stats.reunionsHier)}
          accent="primary"
        />
      </Link>
      <Link href="/ma-journee" className="block">
        <KpiCard label="Charge de travail" value={`${formatHours(stats.chargeHeures)} / ${formatHours(stats.capaciteHeures)}`} accent={chargeAccent} />
      </Link>
      <Link href="/planning-personnel#planning-health" className="block">
        <KpiCard label="Planning Health" value={`${stats.planningHealth}/100`} accent={healthAccent} />
      </Link>
    </div>
  );
}
