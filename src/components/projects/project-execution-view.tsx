import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { toneForStatus } from "@/lib/status-tone";

export type ExecutionTaskRow = {
  id: string;
  titre: string;
  statut: string;
  responsableNom: string;
  echeance: string | null;
};

export type ExecutionMilestoneRow = { id: string; nom: string; statut: string; dateCible: string };
export type ExecutionDeliverableRow = { id: string; nom: string; statut: string; echeance: string | null };
export type ExecutionRiskRow = { id: string; titre: string; statut: string };

/**
 * Vue d'exécution (Project Studio §40) — consolide en un seul tableau de
 * bord des donnees deja disponibles ailleurs (onglets Tâches/Jalons/
 * Livrables/Risques/Budget/KPI) plutot que de les recalculer : une vue de
 * synthese pour le pilotage quotidien, pas une nouvelle source de verite.
 */
export function ProjectExecutionView({
  tasks,
  milestones,
  deliverables,
  risks,
  budgetPrevu,
  budgetEngage,
  budgetPaye,
  devise,
  avancement,
}: {
  tasks: ExecutionTaskRow[];
  milestones: ExecutionMilestoneRow[];
  deliverables: ExecutionDeliverableRow[];
  risks: ExecutionRiskRow[];
  budgetPrevu: number;
  budgetEngage: number;
  budgetPaye: number;
  devise: string;
  avancement: number;
}) {
  const openTasks = tasks.filter((t) => t.statut !== "TERMINEE" && t.statut !== "ANNULEE");
  const overdueTasks = openTasks.filter((t) => t.echeance && new Date(t.echeance) < new Date());
  const activeRisks = risks.filter((r) => r.statut !== "MAITRISE" && r.statut !== "CLOS");
  const upcomingMilestones = milestones
    .filter((m) => m.statut === "A_VENIR")
    .sort((a, b) => new Date(a.dateCible).getTime() - new Date(b.dateCible).getTime())
    .slice(0, 5);
  const pendingDeliverables = deliverables.filter((d) => d.statut !== "VALIDE" && d.statut !== "REJETE");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Avancement" value={`${avancement}%`} />
        <KpiCard label="Tâches ouvertes" value={openTasks.length} accent={overdueTasks.length > 0 ? "destructive" : undefined} />
        <KpiCard label="Risques actifs" value={activeRisks.length} accent={activeRisks.length > 0 ? "warning" : undefined} />
        <KpiCard label="Budget engagé" value={`${Math.round((budgetEngage / (budgetPrevu || 1)) * 100)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tâches en retard ({overdueTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tâche en retard.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overdueTasks.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <Link href={`/taches/${t.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span>{t.titre}</span>
                      <span className="text-xs text-muted-foreground">{t.responsableNom}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prochains jalons</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun jalon à venir.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcomingMilestones.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span>{m.nom}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.dateCible).toLocaleDateString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Livrables en cours ({pendingDeliverables.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDeliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun livrable en attente.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pendingDeliverables.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>{d.nom}</span>
                    <Badge variant={toneForStatus(d.statut)}>{d.statut}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Prévu</div>
              <div className="font-medium">{budgetPrevu.toLocaleString("fr-FR")} {devise}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Engagé</div>
              <div className="font-medium">{budgetEngage.toLocaleString("fr-FR")} {devise}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Payé</div>
              <div className="font-medium">{budgetPaye.toLocaleString("fr-FR")} {devise}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Détails complets dans les onglets Tâches, Jalons, Livrables, Risques, Budget et KPI de ce projet.
      </p>
    </div>
  );
}
