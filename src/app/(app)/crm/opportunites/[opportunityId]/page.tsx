import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accentForOpportunityStatus } from "@/lib/status-tone";
import { InteractionLog } from "@/components/crm/interaction-log";
import { OpportunityStatusSelect } from "@/components/crm/opportunity-status-select";
import { ContractFormDialog } from "@/components/crm/contract-form-dialog";
import { Badge } from "@/components/ui/badge";
import { getUserEntityScope } from "@/lib/entity-scope";
import { getOrganizationDevise } from "@/lib/currency";

export default async function CrmOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  const opportunity = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    include: {
      contact: true,
      organization: true,
      owner: true,
      interactions: {
        include: { author: true },
        orderBy: { dateInteraction: "desc" },
      },
      contracts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  if (!entityScope.canViewAll) {
    // Meme priorite que crmOpportunityScopeWhere : entite du contact si
    // renseignee, sinon entite de l'organisation.
    const effectiveEntityId = opportunity.contact ? opportunity.contact.entityId : (opportunity.organization?.entityId ?? null);
    if (effectiveEntityId !== null && !entityScope.scopeEntityIds.includes(effectiveEntityId)) {
      notFound();
    }
  }

  const montant =
    opportunity.montantEstime !== null
      ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(opportunity.montantEstime))
      : null;
  const devise = await getOrganizationDevise();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{opportunity.nom}</h1>
            <OpportunityStatusSelect opportunityId={opportunity.id} initialStatut={opportunity.statut} />
          </div>
          <p className="text-sm text-muted-foreground">
            {opportunity.contact && (
              <Link href={`/crm/contacts/${opportunity.contact.id}`} className="text-primary hover:underline">
                {opportunity.contact.prenom} {opportunity.contact.nom}
              </Link>
            )}
            {opportunity.contact && opportunity.organization && " · "}
            {opportunity.organization && (
              <Link href={`/crm/organisations/${opportunity.organization.id}`} className="text-primary hover:underline">
                {opportunity.organization.nom}
              </Link>
            )}
          </p>
        </div>

        <Card accent={accentForOpportunityStatus(opportunity.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Montant estimé" value={montant ? `${montant} ${devise}` : "—"} />
            <Info label="Probabilité" value={opportunity.probabilite !== null ? `${opportunity.probabilite}%` : "—"} />
            <Info label="Responsable" value={opportunity.owner.name} />
            <Info label="Source" value={opportunity.source || "—"} />
            <Info
              label="Clôture estimée"
              value={
                opportunity.dateClotureEstimee
                  ? opportunity.dateClotureEstimee.toLocaleDateString("fr-FR")
                  : "—"
              }
            />
            {opportunity.statut === "PERDUE" && (
              <Info label="Raison de la perte" value={opportunity.raisonPerte || "—"} />
            )}
          </CardContent>
          {opportunity.notes && (
            <CardContent className="pt-0 text-sm text-muted-foreground">{opportunity.notes}</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionLog
              opportunityId={opportunity.id}
              interactions={opportunity.interactions.map((i) => ({
                id: i.id,
                type: i.type,
                contenu: i.contenu,
                dateInteraction: i.dateInteraction.toISOString(),
                authorName: i.author.name,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contrats</CardTitle>
            <ContractFormDialog defaultOpportunityId={opportunity.id} defaultOrganizationId={opportunity.organization?.id} />
          </CardHeader>
          <CardContent>
            {opportunity.contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contrat lié.</p>
            ) : (
              <ul className="space-y-2">
                {opportunity.contracts.map((c) => (
                  <li key={c.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.nom}</span>
                      <Badge variant="outline">{c.statut}</Badge>
                    </div>
                    {c.montant !== null && (
                      <div className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(c.montant))} {devise}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
