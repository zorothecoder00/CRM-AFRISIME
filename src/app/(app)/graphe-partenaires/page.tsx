import Link from "next/link";
import { buildPartnerEcosystemGraph, computePartnerEcosystemAnalysis } from "@/lib/partner-ecosystem-graph";
import { PartnerEcosystemGraphView } from "@/components/partner-ecosystem/partner-ecosystem-graph-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Partner Ecosystem Graph (cahier des charges V3.0 §26) — visualise
// Organisation ↔ partenaires ↔ projets ↔ clients ↔ institutions ↔
// investisseurs, et identifie partenaires stratégiques, dépendances,
// risques, opportunités et relations critiques.
export default async function GraphePartenairesPage() {
  const [graph, analysis] = await Promise.all([buildPartnerEcosystemGraph(), computePartnerEcosystemAnalysis()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Partner Ecosystem Graph</h1>
        <p className="text-sm text-muted-foreground">
          Organisation ↔ partenaires ↔ projets ↔ clients ↔ institutions ↔ investisseurs.
        </p>
      </div>

      <PartnerEcosystemGraphView nodes={graph.nodes} edges={graph.edges} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partenaires stratégiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analysis.partenairesStrategiques.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun identifié (influence et intérêt élevés requis).</p>
            ) : (
              analysis.partenairesStrategiques.map((p) => (
                <Link key={p.contactId} href={`/crm/contacts/${p.contactId}`} className="block text-sm underline">
                  {p.nom} <span className="text-xs text-muted-foreground">({p.type.toLowerCase()})</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relations critiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analysis.relationsCritiques.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune relation critique détectée.</p>
            ) : (
              analysis.relationsCritiques.map((r, i) => (
                <div key={i} className="text-sm">
                  <Link href={`/crm/contacts/${r.contactId}`} className="underline">
                    {r.nom}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">— {r.raison}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analysis.risques.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun risque identifié.</p>
            ) : (
              analysis.risques.map((r, i) => (
                <div key={i} className="text-sm">
                  <Link href={`/crm/contacts/${r.contactId}`} className="underline">
                    {r.nom}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">— {r.raison}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opportunités</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analysis.opportunites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune opportunité ouverte.</p>
            ) : (
              analysis.opportunites.map((o, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>
                    {o.opportunite} <span className="text-xs text-muted-foreground">({o.nom})</span>
                  </span>
                  {o.montantEstime !== null && <Badge variant="outline">{o.montantEstime.toLocaleString("fr-FR")} €</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dépendances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {analysis.dependances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépendance enregistrée impliquant un acteur de l&apos;écosystème.</p>
          ) : (
            analysis.dependances.map((d) => (
              <div key={`${d.id}-${d.autreId}`} className="text-sm">
                <Link href={`/crm/contacts/${d.contactId}`} className="underline">
                  {d.nom}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">
                  {d.direction === "DEPEND_DE" && `dépend de ${d.autreLabel} (${d.autreType})`}
                  {d.direction === "DONT_DEPEND" && `dont dépend ${d.autreLabel} (${d.autreType})`}
                  {d.direction === "LIE_A" && `lié à ${d.autreLabel} (${d.autreType})`}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
