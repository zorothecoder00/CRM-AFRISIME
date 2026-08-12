import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { toneForOpportunityStatus } from "@/lib/status-tone";
import { Users, Building2, TrendingUp, Percent } from "lucide-react";

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

const ACTIVE_STAGES = ["NOUVEAU", "QUALIFICATION", "PROPOSITION", "NEGOCIATION"];

export default async function CrmHomePage() {
  const [contactCount, organizationCount, opportunities, recentInteractions] = await Promise.all([
    prisma.crmContact.count(),
    prisma.crmOrganization.count(),
    prisma.crmOpportunity.findMany({ select: { statut: true, montantEstime: true, probabilite: true } }),
    prisma.crmInteraction.findMany({
      include: {
        author: true,
        contact: true,
        organization: true,
        opportunity: true,
      },
      orderBy: { dateInteraction: "desc" },
      take: 8,
    }),
  ]);

  const activeOpportunities = opportunities.filter((o) => ACTIVE_STAGES.includes(o.statut));
  const pipelineValue = activeOpportunities.reduce((sum, o) => {
    const montant = o.montantEstime !== null ? Number(o.montantEstime) : 0;
    const proba = o.probabilite !== null ? o.probabilite / 100 : 1;
    return sum + montant * proba;
  }, 0);

  const gagnees = opportunities.filter((o) => o.statut === "GAGNEE").length;
  const perdues = opportunities.filter((o) => o.statut === "PERDUE").length;
  const conversionRate = gagnees + perdues > 0 ? Math.round((gagnees / (gagnees + perdues)) * 100) : null;

  const byStage = Object.keys(OPPORTUNITY_STATUS_LABELS).map((stage) => ({
    stage,
    count: opportunities.filter((o) => o.statut === stage).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble des relations et du pipeline commercial.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={contactCount} icon={Users} tone="info" />
        <StatCard label="Organisations" value={organizationCount} icon={Building2} tone="info" />
        <StatCard
          label="Opportunités actives"
          value={activeOpportunities.length}
          icon={TrendingUp}
          tone="default"
        />
        <StatCard
          label="Taux de conversion"
          value={conversionRate !== null ? `${conversionRate}%` : "—"}
          icon={Percent}
          tone={conversionRate !== null && conversionRate >= 50 ? "success" : "default"}
          description={`${gagnees} gagnée(s) · ${perdues} perdue(s)`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KpiCard label="Valeur du pipeline (pondérée par probabilité)" value={pipelineValue} />
        <KpiCard label="Opportunités au total" value={opportunities.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition par étape</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {byStage.map(({ stage, count }) => (
              <li key={stage} className="flex items-center justify-between text-sm">
                <Badge variant={toneForOpportunityStatus(stage)}>{OPPORTUNITY_STATUS_LABELS[stage]}</Badge>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières interactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInteractions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune interaction enregistrée.</p>
          ) : (
            <ul className="space-y-2">
              {recentInteractions.map((i) => {
                const target = i.contact
                  ? { label: `${i.contact.prenom} ${i.contact.nom}`, href: `/crm/contacts/${i.contact.id}` }
                  : i.organization
                    ? { label: i.organization.nom, href: `/crm/organisations/${i.organization.id}` }
                    : i.opportunity
                      ? { label: i.opportunity.nom, href: `/crm/opportunites/${i.opportunity.id}` }
                      : null;
                return (
                  <li key={i.id}>
                    <Link
                      href={target?.href ?? "/crm"}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{target?.label ?? "—"}</span>
                        {" · "}
                        <span className="text-muted-foreground">{i.contenu}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {i.author.name} · {i.dateInteraction.toLocaleDateString("fr-FR")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
