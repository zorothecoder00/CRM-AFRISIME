import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { buildExecutiveSnapshot } from "@/lib/executive-command-center";
import { getOrganizationDevise } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, Target, ShieldAlert, Landmark, Gauge, Handshake, Bell, TrendingUp, FolderKanban, Wallet, Link2 } from "lucide-react";

function StatCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: React.ElementType;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <Link href={href} className="text-xs text-primary hover:underline">
          Détail →
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

// Strategic Command Center (cahier des charges V2.2 §29, étendu V3.0 §35
// avec Finances et Partenaires) — reserve aux dirigeants via
// PERMISSIONS.EXECUTIVE_VIEW. Assemble 11 sources deja existantes (voir
// src/lib/executive-command-center.ts) : aucune nouvelle donnee, seulement
// une vue unifiee.
export default async function ExecutiveCommandCenterPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.EXECUTIVE_VIEW)) {
    redirect("/dashboard");
  }

  const [snap, devise] = await Promise.all([buildExecutiveSnapshot(), getOrganizationDevise()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radar className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Centre de commande</h1>
          <p className="text-sm text-muted-foreground">Vue instantanée réservée aux dirigeants.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Gauge} title="Performance globale" href="/pilotage">
          <p>Avancement moyen : {snap.performanceGlobale.avancementMoyen ?? "—"}%</p>
          <p>Taux de respect des délais : {snap.performanceGlobale.tauxRespectDelais ?? "—"}%</p>
          <p>Budget dépassé sur {snap.performanceGlobale.budgetDepasseCount} projet(s)</p>
        </StatCard>

        <StatCard icon={Target} title="Objectifs" href="/objectifs">
          <p>{snap.objectifs.total} objectif(s) au total</p>
          <p>{snap.objectifs.atteints} atteint(s)</p>
          {snap.objectifs.enRetard > 0 && <Badge variant="warning">{snap.objectifs.enRetard} en retard</Badge>}
        </StatCard>

        <StatCard icon={FolderKanban} title="Projets critiques" href="/projets">
          {snap.projetsCritiques.length === 0 && <p className="text-muted-foreground">Aucun projet critique.</p>}
          {snap.projetsCritiques.slice(0, 5).map((p) => (
            <Link key={p.id} href={`/projets/${p.id}`} className="block hover:underline">
              {p.nom} — {p.avancement}%
            </Link>
          ))}
        </StatCard>

        <StatCard icon={ShieldAlert} title="Risques critiques" href="/risques">
          {snap.risquesCritiques.length === 0 && <p className="text-muted-foreground">Aucun risque critique.</p>}
          {snap.risquesCritiques.slice(0, 5).map((r) => (
            <div key={`${r.type}-${r.id}`} className="flex items-center gap-2">
              <Badge variant="destructive">{r.criticite}</Badge>
              <span>{r.titre}</span>
            </div>
          ))}
        </StatCard>

        <StatCard icon={Landmark} title="Décisions en attente" href="/gouvernance">
          {snap.decisionsEnAttente.length === 0 && <p className="text-muted-foreground">Aucune décision en attente.</p>}
          {snap.decisionsEnAttente.slice(0, 5).map((d) => (
            <Link key={d.id} href={d.href} className="block truncate hover:underline">
              {d.libelle}
            </Link>
          ))}
        </StatCard>

        <StatCard icon={Gauge} title="Charge des équipes" href="/charge-de-travail">
          <p>{snap.chargeEquipes.sousCharge} sous-charge</p>
          <p>{snap.chargeEquipes.chargeNormale} charge normale</p>
          {snap.chargeEquipes.surcharge > 0 && <Badge variant="warning">{snap.chargeEquipes.surcharge} en surcharge</Badge>}
        </StatCard>

        <StatCard icon={Handshake} title="Opportunités CRM" href="/crm/pipeline">
          <p>{snap.opportunitesCrm.total} opportunité(s)</p>
          <p>{snap.opportunitesCrm.montantTotal.toLocaleString("fr-FR")} {devise} — pipeline total</p>
        </StatCard>

        <StatCard icon={Bell} title="Alertes" href="/agents-ia">
          {snap.alertes.length === 0 && <p className="text-muted-foreground">Aucune alerte active.</p>}
          {snap.alertes.slice(0, 5).map((a) => (
            <div key={a.id}>
              <p className="font-medium">{a.titre}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{a.contenu}</p>
            </div>
          ))}
        </StatCard>

        <StatCard icon={TrendingUp} title="Prévisions IA" href="/predictions">
          <p>Risque de surcharge global : {snap.previsionsIa.risqueSurcharge}%</p>
          <p>
            Productivité : {snap.previsionsIa.baisseProductivite ? "en baisse" : "stable ou en hausse"}
            {snap.previsionsIa.variationProductivitePercent !== null &&
              ` (${snap.previsionsIa.variationProductivitePercent > 0 ? "+" : ""}${snap.previsionsIa.variationProductivitePercent}%)`}
          </p>
        </StatCard>

        <StatCard icon={Wallet} title="Finances" href="/administration/integrations">
          <p>Budget (projets actifs) : {snap.finances.budgetTotalProjetsActifs.toLocaleString("fr-FR")} {devise}</p>
          <p>Coût réel : {snap.finances.coutReelTotalProjetsActifs.toLocaleString("fr-FR")} {devise}</p>
          <p className={snap.finances.ecartBudgetaire > 0 ? "text-destructive" : ""}>
            Écart : {snap.finances.ecartBudgetaire > 0 ? "+" : ""}
            {snap.finances.ecartBudgetaire.toLocaleString("fr-FR")} {devise}
          </p>
          {snap.finances.systemesFinanciersConnectes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun système financier connecté.</p>
          ) : (
            snap.finances.systemesFinanciersConnectes.map((s) => (
              <Badge key={s.id} variant={s.statut === "CONNECTE" ? "success" : "secondary"}>
                {s.nom}
              </Badge>
            ))
          )}
        </StatCard>

        <StatCard icon={Link2} title="Partenaires" href="/graphe-partenaires">
          <p>{snap.partenaires.partenairesStrategiquesCount} partenaire(s) stratégique(s)</p>
          {snap.partenaires.relationsCritiquesCount > 0 && (
            <Badge variant="warning">{snap.partenaires.relationsCritiquesCount} relation(s) critique(s)</Badge>
          )}
          {snap.partenaires.risquesCount > 0 && <Badge variant="destructive">{snap.partenaires.risquesCount} risque(s)</Badge>}
        </StatCard>
      </div>
    </div>
  );
}
