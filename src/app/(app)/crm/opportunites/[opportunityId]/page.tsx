import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accentForOpportunityStatus } from "@/lib/status-tone";
import { InteractionLog } from "@/components/crm/interaction-log";
import { OpportunityStatusSelect } from "@/components/crm/opportunity-status-select";

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
    },
  });

  if (!opportunity) {
    notFound();
  }

  const montant =
    opportunity.montantEstime !== null
      ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(opportunity.montantEstime))
      : null;

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
            <Info label="Montant estimé" value={montant ? `${montant} FCFA` : "—"} />
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
