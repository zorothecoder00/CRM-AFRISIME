import Link from "next/link";
import { buildPartnerEcosystemGraph, computePartnerEcosystemAnalysis } from "@/lib/partner-ecosystem-graph";
import { PartnerEcosystemGraphView } from "@/components/partner-ecosystem/partner-ecosystem-graph-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpandableList } from "@/components/ui/expandable-list";
import { getOrganizationDevise } from "@/lib/currency";

const MAX_VISIBLE = 5;

// Partner Ecosystem Graph (cahier des charges V3.0 §26) — visualise
// Organisation ↔ partenaires ↔ projets ↔ clients ↔ institutions ↔
// investisseurs, et identifie partenaires stratégiques, dépendances,
// risques, opportunités et relations critiques.
export default async function GraphePartenairesPage() {
  const [graph, analysis, devise] = await Promise.all([
    buildPartnerEcosystemGraph(),
    computePartnerEcosystemAnalysis(),
    getOrganizationDevise(),
  ]);

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
              (() => {
                const row = (p: (typeof analysis.partenairesStrategiques)[number]) => (
                  <Link key={p.contactId} href={`/crm/contacts/${p.contactId}`} className="block text-sm underline">
                    {p.nom} <span className="text-xs text-muted-foreground">({p.type.toLowerCase()})</span>
                  </Link>
                );
                return <ExpandableList items={analysis.partenairesStrategiques.map(row)} max={MAX_VISIBLE} />;
              })()
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
              (() => {
                const row = (r: (typeof analysis.relationsCritiques)[number], i: number) => (
                  <div key={i} className="text-sm">
                    <Link href={`/crm/contacts/${r.contactId}`} className="underline">
                      {r.nom}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">— {r.raison}</span>
                  </div>
                );
                return <ExpandableList items={analysis.relationsCritiques.map(row)} max={MAX_VISIBLE} />;
              })()
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
              (() => {
                const row = (r: (typeof analysis.risques)[number], i: number) => (
                  <div key={i} className="text-sm">
                    <Link href={`/crm/contacts/${r.contactId}`} className="underline">
                      {r.nom}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">— {r.raison}</span>
                  </div>
                );
                return <ExpandableList items={analysis.risques.map(row)} max={MAX_VISIBLE} />;
              })()
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
              (() => {
                const row = (o: (typeof analysis.opportunites)[number], i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>
                      {o.opportunite} <span className="text-xs text-muted-foreground">({o.nom})</span>
                    </span>
                    {o.montantEstime !== null && <Badge variant="outline">{o.montantEstime.toLocaleString("fr-FR")} {devise}</Badge>}
                  </div>
                );
                return <ExpandableList items={analysis.opportunites.map(row)} max={MAX_VISIBLE} />;
              })()
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
            (() => {
              const row = (d: (typeof analysis.dependances)[number]) => (
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
              );
              return <ExpandableList items={analysis.dependances.map(row)} max={MAX_VISIBLE} />;
            })()
          )}
        </CardContent>
      </Card>
    </div>
  );
}
