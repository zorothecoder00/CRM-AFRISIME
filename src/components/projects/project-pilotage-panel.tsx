import { StatCard, type StatCardTone } from "@/components/ui/stat-card";
import type { ProjectPilotage } from "@/lib/project-pilotage";
import { TrendingUp, Wallet, Clock, Users, AlertTriangle, BadgeCheck, Gauge, Package } from "lucide-react";

function formatMontant(montant: number | null) {
  if (montant === null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant)} FCFA`;
}

function toneForRate(rate: number | null): StatCardTone {
  if (rate === null) return "default";
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

/** Panneau des 8 indicateurs de pilotage attendus par le projet (cahier des charges §VI). */
export function ProjectPilotagePanel({ pilotage }: { pilotage: ProjectPilotage }) {
  const delaisLabel =
    pilotage.delais.statut === "en_retard"
      ? `En retard (${pilotage.delais.joursRetard} j)`
      : pilotage.delais.statut === "a_jour"
        ? "À jour"
        : "Sans échéance";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Avancement" value={`${pilotage.avancement}%`} icon={TrendingUp} tone="info" />

      <StatCard
        label="Budget"
        value={formatMontant(pilotage.budget.coutReel)}
        icon={Wallet}
        tone={pilotage.budget.depasse ? "danger" : "success"}
        description={pilotage.budget.montant !== null ? `Budget : ${formatMontant(pilotage.budget.montant)}` : "Aucun budget renseigné"}
      />

      <StatCard
        label="Délais"
        value={delaisLabel}
        icon={Clock}
        tone={pilotage.delais.statut === "en_retard" ? "danger" : pilotage.delais.statut === "a_jour" ? "success" : "default"}
      />

      <StatCard
        label="Charge"
        value={pilotage.charge.tauxOccupationMoyen !== null ? `${pilotage.charge.tauxOccupationMoyen}%` : "—"}
        icon={Users}
        tone="info"
        description={`${pilotage.charge.membreCount} membre(s)`}
      />

      <StatCard
        label="Risques"
        value={pilotage.risques.actifs}
        icon={AlertTriangle}
        tone={pilotage.risques.critiques > 0 ? "danger" : pilotage.risques.actifs > 0 ? "warning" : "success"}
        description={
          pilotage.risques.total === 0
            ? "Aucun risque identifié"
            : `${pilotage.risques.critiques} critique(s) sur ${pilotage.risques.total}`
        }
      />

      <StatCard
        label="Qualité"
        value={pilotage.qualite.tauxApprobation !== null ? `${pilotage.qualite.tauxApprobation}%` : "—"}
        icon={BadgeCheck}
        tone={toneForRate(pilotage.qualite.tauxApprobation)}
        description={
          pilotage.qualite.approuves + pilotage.qualite.rejetes > 0
            ? `${pilotage.qualite.approuves} validée(s), ${pilotage.qualite.rejetes} rejetée(s)`
            : "Aucune tâche validée pour l'instant"
        }
      />

      <StatCard
        label="Performance"
        value={pilotage.performance.tauxRespectDelais !== null ? `${pilotage.performance.tauxRespectDelais}%` : "—"}
        icon={Gauge}
        tone={toneForRate(pilotage.performance.tauxRespectDelais)}
        description={
          pilotage.performance.total > 0
            ? `${pilotage.performance.aTemps}/${pilotage.performance.total} tâches à temps`
            : "Aucune tâche terminée avec échéance"
        }
      />

      <StatCard
        label="Livrables"
        value={pilotage.livrables.tauxCompletion !== null ? `${pilotage.livrables.tauxCompletion}%` : "—"}
        icon={Package}
        tone={toneForRate(pilotage.livrables.tauxCompletion)}
        description={
          pilotage.livrables.total > 0
            ? `${pilotage.livrables.valides}/${pilotage.livrables.total} validés`
            : "Aucun livrable défini"
        }
      />
    </div>
  );
}
