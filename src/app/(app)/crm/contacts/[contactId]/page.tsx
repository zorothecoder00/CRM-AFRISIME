import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForOpportunityStatus, accentForContactType } from "@/lib/status-tone";
import { InteractionLog } from "@/components/crm/interaction-log";
import { RelationshipGraphView } from "@/components/crm/relationship-graph-view";
import { buildRelationshipGraph } from "@/lib/relationship-graph";
import { OpportunityFormDialog } from "@/components/crm/opportunity-form-dialog";
import { PortalAccessCard } from "@/components/crm/portal-access-card";

const TYPE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  PROSPECT: "Prospect",
  PARTENAIRE: "Partenaire",
  FOURNISSEUR: "Fournisseur",
  CONSULTANT: "Consultant",
  PRESTATAIRE: "Prestataire",
  CANDIDAT: "Candidat",
  MEMBRE: "Membre",
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

export default async function CrmContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canManage = session!.user.permissions.includes(PERMISSIONS.CRM_MANAGE);

  const [contact, organizations, contacts, users] = await Promise.all([
    prisma.crmContact.findUnique({
      where: { id: contactId },
      include: {
        organization: true,
        owner: true,
        opportunities: { orderBy: { createdAt: "desc" } },
        interactions: {
          include: { author: true },
          orderBy: { dateInteraction: "desc" },
        },
        portalAccount: true,
        stakeholderOf: { include: { project: true } },
        documentsUploaded: { include: { project: true }, orderBy: { createdAt: "desc" }, take: 10 },
        missions: { include: { project: true }, orderBy: { updatedAt: "desc" } },
      },
    }),
    prisma.crmOrganization.findMany({ orderBy: { nom: "asc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!contact) {
    notFound();
  }

  const graph = await buildRelationshipGraph("CrmContact", contact.id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {contact.prenom} {contact.nom}
            </h1>
            <Badge variant="outline">{TYPE_LABELS[contact.type]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {contact.fonction || "Fonction non renseignée"}
            {contact.organization && (
              <>
                {" · "}
                <Link href={`/crm/organisations/${contact.organization.id}`} className="text-primary hover:underline">
                  {contact.organization.nom}
                </Link>
              </>
            )}
          </p>
        </div>

        <Card accent={accentForContactType(contact.type)}>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Email" value={contact.email || "—"} />
            <Info label="Téléphone" value={contact.telephone || "—"} />
            <Info label="Source" value={contact.source || "—"} />
            <Info label="Responsable" value={contact.owner?.name ?? "—"} />
            <Info label="Segment" value={contact.segment || "—"} />
            <Info label="Score" value={contact.score !== null ? `${contact.score} / 100` : "—"} />
            <Info
              label="Prochaine relance"
              value={contact.prochaineRelance ? contact.prochaineRelance.toLocaleDateString("fr-FR") : "—"}
            />
          </CardContent>
          {contact.notes && (
            <CardContent className="pt-0 text-sm text-muted-foreground">{contact.notes}</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionLog
              contactId={contact.id}
              interactions={contact.interactions.map((i) => ({
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
            <CardTitle className="text-base">Opportunités</CardTitle>
            {canManage && (
              <OpportunityFormDialog
                contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
                organizations={organizations.map((o) => ({ id: o.id, label: o.nom }))}
                users={users.map((u) => ({ id: u.id, label: u.name }))}
                currentUserId={userId}
                defaultContactId={contact.id}
                defaultOrganizationId={contact.organizationId ?? undefined}
              />
            )}
          </CardHeader>
          <CardContent>
            {contact.opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune opportunité liée.</p>
            ) : (
              <ul className="space-y-2">
                {contact.opportunities.map((o) => (
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

        {(contact.stakeholderOf.length > 0 || contact.missions.length > 0 || contact.documentsUploaded.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fiche 360°</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {contact.stakeholderOf.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Projets liés</div>
                  <ul className="space-y-1">
                    {contact.stakeholderOf.map((s) => (
                      <li key={s.id}>
                        <Link href={`/projets/${s.project.id}`} className="text-primary hover:underline">
                          {s.project.nom}
                        </Link>
                        {s.role && <span className="text-muted-foreground"> — {s.role}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contact.missions.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Missions / tâches</div>
                  <ul className="space-y-1">
                    {contact.missions.map((m) => (
                      <li key={m.id}>
                        <Link href={`/taches/${m.id}`} className="text-primary hover:underline">
                          {m.titre}
                        </Link>
                        <span className="text-muted-foreground"> · {m.project.nom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {contact.documentsUploaded.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Documents déposés</div>
                  <ul className="space-y-1">
                    {contact.documentsUploaded.map((d) => (
                      <li key={d.id}>
                        <Link href={`/documents/${d.id}`} className="text-primary hover:underline">
                          {d.nom}
                        </Link>
                        <span className="text-muted-foreground"> · {d.project.nom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canManage && (
          <PortalAccessCard
            contactId={contact.id}
            contactEmail={contact.email}
            account={
              contact.portalAccount
                ? {
                    id: contact.portalAccount.id,
                    email: contact.portalAccount.email,
                    isActive: contact.portalAccount.isActive,
                    activatedAt: contact.portalAccount.activatedAt?.toISOString() ?? null,
                    lastLoginAt: contact.portalAccount.lastLoginAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        )}
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
