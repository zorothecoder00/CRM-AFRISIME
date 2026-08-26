import { StatCard, type StatCardTone } from "@/components/ui/stat-card";
import type { EvmResult } from "@/lib/evm";
import { TrendingUp, TrendingDown, Wallet, Target, Gauge, Timer, Flag, ArrowRightLeft } from "lucide-react";

function formatMontant(montant: number, devise: string) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant)} ${devise}`;
}

function toneForIndex(index: number | null): StatCardTone {
  if (index === null) return "default";
  if (index >= 1) return "success";
  return index >= 0.9 ? "warning" : "danger";
}

/** Earned Value Management (cahier des charges Project Studio §43). */
export function ProjectEvmPanel({ evm, devise }: { evm: EvmResult | null; devise: string }) {
  if (evm === null) {
    return (
      <p className="text-sm text-muted-foreground">
        L&apos;analyse de la valeur acquise (EVM) nécessite un projet suffisamment structuré : budget, date de
        début et date de fin renseignés (onglet Aperçu).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Analyse de la valeur acquise — calculée à partir du budget, de l&apos;avancement et du planning du projet.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="PV — Valeur planifiée" value={formatMontant(evm.pv, devise)} icon={Flag} tone="info" />
        <StatCard label="EV — Valeur acquise" value={formatMontant(evm.ev, devise)} icon={Target} tone="info" />
        <StatCard label="AC — Coût réel" value={formatMontant(evm.ac, devise)} icon={Wallet} tone="info" />
        <StatCard
          label="CPI — Indice de coût"
          value={evm.cpi !== null ? evm.cpi.toFixed(2) : "—"}
          icon={evm.cpi !== null && evm.cpi >= 1 ? TrendingUp : TrendingDown}
          tone={toneForIndex(evm.cpi)}
          description={evm.cpi === null ? "Aucun coût réel enregistré" : evm.cpi >= 1 ? "Sous le budget" : "Au-dessus du budget"}
        />
        <StatCard
          label="SPI — Indice de délai"
          value={evm.spi !== null ? evm.spi.toFixed(2) : "—"}
          icon={Gauge}
          tone={toneForIndex(evm.spi)}
          description={evm.spi === null ? "Projet pas encore démarré" : evm.spi >= 1 ? "En avance ou à l'heure" : "En retard sur le planning"}
        />
        <StatCard label="EAC — Estimation à terminaison" value={formatMontant(evm.eac, devise)} icon={ArrowRightLeft} tone={evm.eac > evm.bac ? "danger" : "success"} />
        <StatCard label="ETC — Reste à faire" value={formatMontant(evm.etc, devise)} icon={Timer} tone="default" />
        <StatCard
          label="VAC — Écart à terminaison"
          value={formatMontant(evm.vac, devise)}
          icon={evm.vac >= 0 ? TrendingUp : TrendingDown}
          tone={evm.vac >= 0 ? "success" : "danger"}
          description={evm.vac >= 0 ? "Budget suffisant prévu" : "Dépassement de budget prévu"}
        />
      </div>
    </div>
  );
}
