import { StatCard, type StatCardTone } from "@/components/ui/stat-card";
import type { ScopePilotage } from "@/lib/pilotage-levels";
import { Users, TrendingUp, Wallet, ListChecks, Clock, Gauge, AlertTriangle, Star } from "lucide-react";

function formatMontant(montant: number) {
  if (montant === 0) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant)} FCFA`;
}

function toneForRate(rate: number | null): StatCardTone {
  if (rate === null) return "default";
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

/** Indicateurs agrégés d'un périmètre (Organisation/Direction/Département/Service/Équipe — cahier des charges §XXIII). */
export function ScopePilotagePanel({ pilotage }: { pilotage: ScopePilotage }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Effectif" value={pilotage.headcount} icon={Users} tone="info" />

      <StatCard
        label="Projets actifs"
        value={pilotage.projectsActifs}
        icon={ListChecks}
        tone="info"
        description={`${pilotage.projectsTotal} projet(s) au total`}
      />

      <StatCard
        label="Avancement moyen"
        value={pilotage.avancementMoyen !== null ? `${pilotage.avancementMoyen}%` : "—"}
        icon={TrendingUp}
        tone={toneForRate(pilotage.avancementMoyen)}
      />

      <StatCard
        label="Budget"
        value={formatMontant(pilotage.coutReelTotal)}
        icon={Wallet}
        tone={pilotage.budgetDepasseCount > 0 ? "danger" : "success"}
        description={
          pilotage.budgetDepasseCount > 0
            ? `${pilotage.budgetDepasseCount} projet(s) en dépassement`
            : `Budget : ${formatMontant(pilotage.budgetTotal)}`
        }
      />

      <StatCard
        label="Tâches en retard"
        value={pilotage.tachesEnRetard}
        icon={Clock}
        tone={pilotage.tachesEnRetard > 0 ? "danger" : "success"}
        description={`${pilotage.tachesEnCours} tâche(s) en cours`}
      />

      <StatCard
        label="Respect des délais"
        value={pilotage.tauxRespectDelais !== null ? `${pilotage.tauxRespectDelais}%` : "—"}
        icon={Gauge}
        tone={toneForRate(pilotage.tauxRespectDelais)}
      />

      <StatCard
        label="Charge moyenne"
        value={pilotage.tauxOccupationMoyen !== null ? `${pilotage.tauxOccupationMoyen}%` : "—"}
        icon={Gauge}
        tone={pilotage.tauxOccupationMoyen !== null && pilotage.tauxOccupationMoyen > 100 ? "danger" : "info"}
      />

      <StatCard
        label="Risques critiques"
        value={pilotage.risquesCritiques}
        icon={AlertTriangle}
        tone={pilotage.risquesCritiques > 0 ? "danger" : "success"}
      />

      <StatCard
        label="Score d'évaluation moyen"
        value={pilotage.scoreEvaluationMoyen !== null ? `${pilotage.scoreEvaluationMoyen} / 5` : "—"}
        icon={Star}
        tone={toneForRate(pilotage.scoreEvaluationMoyen !== null ? pilotage.scoreEvaluationMoyen * 20 : null)}
      />
    </div>
  );
}
