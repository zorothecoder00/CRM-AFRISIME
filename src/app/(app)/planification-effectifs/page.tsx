import Link from "next/link";
import { computeWorkforcePlan } from "@/lib/workforce-planning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Workforce Planning 3.0 (cahier des charges V3.0 §22) — besoins futurs,
// compétences critiques, postes à créer, capacités disponibles, projections,
// plans de formation/recrutement. Lecture seule : les actions de formation/
// recrutement restent portées par les modules existants (Évaluations,
// Administration > Postes).
export default async function PlanificationEffectifsPage() {
  const plan = await computeWorkforcePlan();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workforce Planning 3.0</h1>
        <p className="text-sm text-muted-foreground">
          Au-delà de la charge instantanée : besoins futurs, compétences critiques, postes à créer, capacités
          disponibles, projections, formation et recrutement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Effectif actuel" value={plan.effectifActuel} />
        <Stat label="Effectif il y a 12 mois" value={plan.effectifIlYA12Mois} />
        <Stat label="Projection à 12 mois" value={plan.projectionEffectif12Mois} accent />
        <Stat label="Taux d'occupation global" value={`${plan.tauxOccupationGlobal}%`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacité disponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Charge globale actuelle : {plan.chargeGlobaleHeures} h</p>
            <p>Capacité disponible : {plan.capaciteDisponibleHeures} h</p>
            <Link href="/charge-de-travail" className="text-xs text-primary underline">
              Voir le détail par personne
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Postes à créer / pourvoir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.postesVacants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun poste vacant.</p>
            ) : (
              plan.postesVacants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>
                    {p.nom} {p.departement && <span className="text-muted-foreground">— {p.departement}</span>}
                  </span>
                  {p.critique && <Badge variant="destructive">Critique</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compétences critiques</CardTitle>
        </CardHeader>
        <CardContent>
          {plan.competencesCritiques.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun écart de compétence détecté.</p>
          ) : (
            <div className="space-y-2">
              {plan.competencesCritiques.slice(0, 10).map((g) => (
                <div key={g.competence} className="flex items-center justify-between text-sm">
                  <span>{g.competence}</span>
                  <span className="text-muted-foreground">
                    écart {g.ecart} — <Link href="/intelligence-competences" className="underline">{g.recommandation}</Link>
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/intelligence-competences" className="mt-3 inline-block text-xs text-primary underline">
            Voir l&apos;analyse complète (Skills Intelligence)
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan de formation suggéré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {plan.besoinsFormation.length === 0 ? (
              <p className="text-muted-foreground">Aucun besoin de formation identifié.</p>
            ) : (
              plan.besoinsFormation.map((g) => <p key={g.competence}>{g.competence} — renforcer en interne</p>)
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan de recrutement suggéré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {plan.besoinsRecrutement.length === 0 ? (
              <p className="text-muted-foreground">Aucun besoin de recrutement identifié.</p>
            ) : (
              plan.besoinsRecrutement.map((g) => <p key={g.competence}>{g.competence} — recruter (aucune base interne)</p>)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className={`text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
