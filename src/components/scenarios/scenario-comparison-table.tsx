import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScenarioImpact } from "@/lib/scenario-simulation";
import { toneForNiveau } from "@/lib/status-tone";

export type ScenarioColumn = { label: string; impact: ScenarioImpact };

const IMPACT_LEVEL_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };

function formatRepartition(r: ScenarioImpact["chargeRepartition"]) {
  return `${r.sousCharge} sous-charge · ${r.chargeNormale} normale · ${r.surcharge} surcharge`;
}

/**
 * V2.2 §14-§15 — tableau Indicateur | Situation actuelle | Scénario(s),
 * même moteur (computeScenarioImpact) appelé une fois par colonne. Utilisé
 * pour le détail d'un seul scénario (§14, 2 colonnes) comme pour la
 * comparaison multi-scénarios (§15, N colonnes).
 */
export function ScenarioComparisonTable({ baseline, columns }: { baseline: ScenarioImpact; columns: ScenarioColumn[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Estimation par extrapolation simple, pas une simulation détaillée — à affiner avec le contexte métier avant
        décision.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicateur</TableHead>
              <TableHead>Situation actuelle</TableHead>
              {columns.map((c) => (
                <TableHead key={c.label}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Effectif</TableCell>
              <TableCell>{baseline.headcount}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.impact.headcount}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Projets (actifs / total)</TableCell>
              <TableCell>
                {baseline.projectsActifs} / {baseline.projectsTotal}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>
                  {c.impact.projectsActifs} / {c.impact.projectsTotal}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Charge moyenne</TableCell>
              <TableCell>{baseline.tauxOccupationMoyen !== null ? `${baseline.tauxOccupationMoyen}%` : "—"}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>
                  {c.impact.tauxOccupationMoyen !== null ? `${c.impact.tauxOccupationMoyen}%` : "—"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Planning</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {baseline.planningRetardEstimeJours > 0 ? `~${baseline.planningRetardEstimeJours} j de glissement estimé` : "Soutenable"}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-xs text-muted-foreground">
                  {c.impact.planningRetardEstimeJours > 0
                    ? `~${c.impact.planningRetardEstimeJours} j de glissement estimé`
                    : "Soutenable"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Répartition charge</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatRepartition(baseline.chargeRepartition)}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-xs text-muted-foreground">
                  {formatRepartition(c.impact.chargeRepartition)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Risques critiques</TableCell>
              <TableCell>
                <Badge variant={baseline.risquesCritiques > 0 ? "destructive" : "outline"}>{baseline.risquesCritiques}</Badge>
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>
                  <Badge variant={c.impact.risquesCritiques > 0 ? "destructive" : "outline"}>{c.impact.risquesCritiques}</Badge>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Ressources</TableCell>
              <TableCell className="text-xs text-muted-foreground">—</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-xs text-muted-foreground">
                  {c.impact.projetsSousDotes.length > 0
                    ? `${c.impact.projetsSousDotes.length} projet(s) sous-doté(s) : ${c.impact.projetsSousDotes.join(", ")}`
                    : "—"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Compétences</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {baseline.besoinsCompetences.length > 0
                  ? baseline.besoinsCompetences.map((b) => `${b.competenceNom} (${b.demande}/${b.disponible})`).join(", ")
                  : "—"}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-xs text-muted-foreground">
                  {c.impact.besoinsCompetences.length > 0
                    ? c.impact.besoinsCompetences.map((b) => `${b.competenceNom} (${b.demande}/${b.disponible})`).join(", ")
                    : "—"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Charge des managers</TableCell>
              <TableCell>{baseline.chargeManagersMoyen !== null ? `${baseline.chargeManagersMoyen}%` : "—"}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>
                  {c.impact.chargeManagersMoyen !== null ? `${c.impact.chargeManagersMoyen}%` : "—"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Partenaires impactés</TableCell>
              <TableCell>{baseline.partenairesImpactes}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.impact.partenairesImpactes}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Processus impactés</TableCell>
              <TableCell>{baseline.processusImpactes}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.impact.processusImpactes}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Impact organisationnel</TableCell>
              <TableCell>
                <Badge variant={toneForNiveau(baseline.impactOrganisationnel)}>
                  {IMPACT_LEVEL_LABELS[baseline.impactOrganisationnel]}
                </Badge>
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>
                  <Badge variant={toneForNiveau(c.impact.impactOrganisationnel)}>
                    {IMPACT_LEVEL_LABELS[c.impact.impactOrganisationnel]}
                  </Badge>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Budget total</TableCell>
              <TableCell>{baseline.budgetTotal.toLocaleString("fr-FR")}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.impact.budgetTotal.toLocaleString("fr-FR")}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Objectifs</TableCell>
              <TableCell>{baseline.objectifsTotal}</TableCell>
              {columns.map((c) => (
                <TableCell key={c.label}>{c.impact.objectifsTotal}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Indicateurs prévisionnels</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {baseline.indicateursPrevisionnels.length > 0
                  ? baseline.indicateursPrevisionnels.map((i) => `${i.nom} (${i.valeurActuelle}/${i.valeurCible})`).join(", ")
                  : "—"}
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-xs text-muted-foreground">
                  {c.impact.indicateursPrevisionnels.length > 0
                    ? c.impact.indicateursPrevisionnels.map((i) => `${i.nom} : ${i.valeurPrevue}/${i.valeurCible}`).join(", ")
                    : "—"}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
