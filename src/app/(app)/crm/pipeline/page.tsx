import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { OpportunityKanban, type OpportunityRow } from "@/components/crm/opportunity-kanban";
import { OpportunityFormDialog } from "@/components/crm/opportunity-form-dialog";
import { getUserEntityScope, crmOpportunityScopeWhere } from "@/lib/entity-scope";

export default async function CrmPipelinePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canManage = session!.user.permissions.includes(PERMISSIONS.CRM_MANAGE);

  const entityScope = await getUserEntityScope(userId, session!.user.permissions);
  const [opportunities, contacts, organizations, users] = await Promise.all([
    prisma.crmOpportunity.findMany({
      where: crmOpportunityScopeWhere(entityScope),
      include: { contact: true, organization: true, owner: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" } }),
    prisma.crmOrganization.findMany({ orderBy: { nom: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const rows: OpportunityRow[] = opportunities.map((o) => ({
    id: o.id,
    nom: o.nom,
    statut: o.statut,
    contactNom: o.contact ? `${o.contact.prenom} ${o.contact.nom}` : null,
    organizationNom: o.organization?.nom ?? null,
    montantEstime: o.montantEstime !== null ? Number(o.montantEstime) : null,
    ownerNom: o.owner.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">{opportunities.length} opportunité(s)</p>
        </div>
        {canManage && (
          <OpportunityFormDialog
            contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
            organizations={organizations.map((o) => ({ id: o.id, label: o.nom }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            currentUserId={userId}
          />
        )}
      </div>

      <OpportunityKanban opportunities={rows} />
    </div>
  );
}
