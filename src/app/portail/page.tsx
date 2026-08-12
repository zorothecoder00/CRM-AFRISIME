import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForOpportunityStatus, accentForOpportunityStatus } from "@/lib/status-tone";
import { PortalHeader } from "@/components/portal/portal-header";
import { portalLabelForContactType } from "@/lib/contact-portal-label";

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

function formatMontant(montant: number | null) {
  if (montant === null) return null;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const orConditions: Prisma.CrmOpportunityWhereInput[] = [{ contactId: contact.id }];
  if (contact.organizationId) {
    orConditions.push({ organizationId: contact.organizationId });
  }

  const opportunities = await prisma.crmOpportunity.findMany({
    where: { OR: orConditions },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <PortalHeader
        name={`${contact.prenom} ${contact.nom}`}
        email={session.email}
        label={portalLabelForContactType(contact.type)}
      />
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Bonjour {contact.prenom}</h1>
          <p className="text-sm text-muted-foreground">
            {contact.organization ? contact.organization.nom : "Suivi de votre relation avec AfriSime."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map((opportunity) => (
            <Link key={opportunity.id} href={`/portail/opportunites/${opportunity.id}`}>
              <Card
                accent={accentForOpportunityStatus(opportunity.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="text-base">{opportunity.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={toneForOpportunityStatus(opportunity.statut)}>
                    {STATUS_LABELS[opportunity.statut]}
                  </Badge>
                  {opportunity.montantEstime !== null && (
                    <p className="text-sm text-muted-foreground">
                      {formatMontant(Number(opportunity.montantEstime))} FCFA
                    </p>
                  )}
                  {opportunity.dateClotureEstimee && (
                    <p className="text-xs text-muted-foreground">
                      Clôture estimée : {opportunity.dateClotureEstimee.toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
          {opportunities.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune opportunité pour le moment.</p>
          )}
        </div>
      </main>
    </div>
  );
}
