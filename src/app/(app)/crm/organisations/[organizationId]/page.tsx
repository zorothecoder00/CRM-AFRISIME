import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForOpportunityStatus, accentForOrganizationType } from "@/lib/status-tone";
import { InteractionLog } from "@/components/crm/interaction-log";
import { RelationshipGraphView } from "@/components/crm/relationship-graph-view";
import { buildRelationshipGraph } from "@/lib/relationship-graph";
import { ContactFormDialog } from "@/components/crm/contact-form-dialog";
import { OpportunityFormDialog } from "@/components/crm/opportunity-form-dialog";
import { getUserEntityScope } from "@/lib/entity-scope";

const TYPE_LABELS: Record<string, string> = {
  ENTREPRISE: "Entreprise",
  INSTITUTION: "Institution",
  PARTENAIRE: "Partenaire",
  FOURNISSEUR: "Fournisseur",
  INVESTISSEUR: "Investisseur",
  AUTRE: "Autre",
};

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

export default async function CrmOrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canManage = session!.user.permissions.includes(PERMISSIONS.CRM_MANAGE);

  const [organization, organizations, contacts, users] = await Promise.all([
    prisma.crmOrganization.findUnique({
      where: { id: organizationId },
      include: {
        owner: true,
        contacts: { orderBy: { nom: "asc" } },
        opportunities: { orderBy: { createdAt: "desc" } },
        interactions: {
          include: { author: true },
          orderBy: { dateInteraction: "desc" },
        },
      },
    }),
    prisma.crmOrganization.findMany({ orderBy: { nom: "asc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!organization) {
    notFound();
  }

  const entityScope = await getUserEntityScope(userId, session!.user.permissions);
  if (!entityScope.canViewAll && organization.entityId !== null && !entityScope.scopeEntityIds.includes(organization.entityId)) {
    notFound();
  }

  const graph = await buildRelationshipGraph("CrmOrganization", organization.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{organization.nom}</h1>
            <Badge variant="outline">{TYPE_LABELS[organization.type]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{organization.secteur || "Secteur non renseigné"}</p>
        </div>

        <Card accent={accentForOrganizationType(organization.type)}>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Email" value={organization.email || "—"} />
            <Info label="Téléphone" value={organization.telephone || "—"} />
            <Info label="Site web" value={organization.siteWeb || "—"} />
            <Info label="Responsable" value={organization.owner?.name ?? "—"} />
            <Info label="Adresse" value={organization.adresse || "—"} />
          </CardContent>
          {organization.notes && (
            <CardContent className="pt-0 text-sm text-muted-foreground">{organization.notes}</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionLog
              organizationId={organization.id}
              interactions={organization.interactions.map((i) => ({
                id: i.id,
                type: i.type,
                contenu: i.contenu,
                dateInteraction: i.dateInteraction.toISOString(),
                authorName: i.author.name,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cartographie des relations</CardTitle>
          </CardHeader>
          <CardContent>
            <RelationshipGraphView nodes={graph.nodes} edges={graph.edges} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contacts</CardTitle>
            {canManage && (
              <ContactFormDialog
                organizations={organizations.map((o) => ({ id: o.id, label: o.nom }))}
                defaultOrganizationId={organization.id}
              />
            )}
          </CardHeader>
          <CardContent>
            {organization.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contact lié.</p>
            ) : (
              <ul className="space-y-2">
                {organization.contacts.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block rounded-md border p-2 text-sm hover:bg-muted"
                    >
                      <div className="font-medium">
                        {c.prenom} {c.nom}
                      </div>
                      {c.fonction && <div className="text-xs text-muted-foreground">{c.fonction}</div>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Opportunités</CardTitle>
            {canManage && (
              <OpportunityFormDialog
                contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
                organizations={organizations.map((o) => ({ id: o.id, label: o.nom }))}
                users={users.map((u) => ({ id: u.id, label: u.name }))}
                currentUserId={userId}
                defaultOrganizationId={organization.id}
              />
            )}
          </CardHeader>
          <CardContent>
            {organization.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune opportunité liée.</p>
            ) : (
              <ul className="space-y-2">
                {organization.opportunities.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/crm/opportunites/${o.id}`}
                      className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{o.nom}</span>
                      <Badge variant={toneForOpportunityStatus(o.statut)}>
                        {OPPORTUNITY_STATUS_LABELS[o.statut]}
                      </Badge>
                    </Link>
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
