import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForOpportunityStatus, accentForOpportunityStatus } from "@/lib/status-tone";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { Mail, Phone, MessageCircle, CalendarClock, MapPin, type LucideIcon } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

const TYPE_LABELS: Record<string, string> = {
  EMAIL: "Email",
  APPEL: "Appel",
  WHATSAPP: "WhatsApp",
  REUNION: "Réunion",
  VISITE: "Visite",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  EMAIL: Mail,
  APPEL: Phone,
  WHATSAPP: MessageCircle,
  REUNION: CalendarClock,
  VISITE: MapPin,
};

function formatMontant(montant: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

export default async function PortalOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const opportunity = await prisma.crmOpportunity.findUnique({
    where: { id: opportunityId },
    include: { interactions: { orderBy: { dateInteraction: "desc" } } },
  });

  if (!opportunity) {
    notFound();
  }

  const belongsToContact = opportunity.contactId === contact.id;
  const belongsToOrganization =
    !!contact.organizationId && opportunity.organizationId === contact.organizationId;
  if (!belongsToContact && !belongsToOrganization) {
    notFound();
  }

  // Seuls les echanges de communication (email/appel/whatsapp/reunion/visite)
  // sont affiches au client — les "Note" internes (strategie, commentaires
  // d'equipe) restent reservees au personnel, il n'y a pas de champ
  // "visible au client" dans le schema pour les distinguer autrement.
  const clientVisibleInteractions = opportunity.interactions.filter((i) => i.type !== "NOTE");
  const visibility = await computePortalNavVisibility(contact.id);

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
      maxWidthClassName="max-w-3xl"
    >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{opportunity.nom}</h1>
          <Badge variant={toneForOpportunityStatus(opportunity.statut)}>
            {STATUS_LABELS[opportunity.statut]}
          </Badge>
        </div>

        <Card accent={accentForOpportunityStatus(opportunity.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info
              label="Montant estimé"
              value={opportunity.montantEstime ? `${formatMontant(Number(opportunity.montantEstime))} FCFA` : "—"}
            />
            <Info
              label="Clôture estimée"
              value={
                opportunity.dateClotureEstimee
                  ? opportunity.dateClotureEstimee.toLocaleDateString("fr-FR")
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des échanges</CardTitle>
          </CardHeader>
          <CardContent>
            {clientVisibleInteractions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun échange enregistré.</p>
            ) : (
              <ol className="space-y-3">
                {clientVisibleInteractions.map((interaction) => {
                  const Icon = TYPE_ICONS[interaction.type] ?? Mail;
                  return (
                    <li key={interaction.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 text-sm">
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {TYPE_LABELS[interaction.type] ?? interaction.type}
                          </span>
                          <span>{interaction.dateInteraction.toLocaleString("fr-FR")}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{interaction.contenu}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
    </PortalShell>
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
