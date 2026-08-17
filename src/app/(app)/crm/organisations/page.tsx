import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accentForOrganizationType } from "@/lib/status-tone";
import { OrganizationFormDialog } from "@/components/crm/organization-form-dialog";
import { getUserEntityScope, crmOrganizationScopeWhere } from "@/lib/entity-scope";

const TYPE_LABELS: Record<string, string> = {
  ENTREPRISE: "Entreprise",
  INSTITUTION: "Institution",
  PARTENAIRE: "Partenaire",
  FOURNISSEUR: "Fournisseur",
  INVESTISSEUR: "Investisseur",
  AUTRE: "Autre",
};

export default async function CrmOrganizationsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.CRM_MANAGE);

  const entityScope = await getUserEntityScope(session!.user.id, session!.user.permissions);
  const organizations = await prisma.crmOrganization.findMany({
    where: crmOrganizationScopeWhere(entityScope),
    include: { _count: { select: { contacts: true, opportunities: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organisations</h1>
          <p className="text-sm text-muted-foreground">{organizations.length} organisation(s)</p>
        </div>
        {canManage && <OrganizationFormDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Link key={org.id} href={`/crm/organisations/${org.id}`}>
            <Card
              accent={accentForOrganizationType(org.type)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{org.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{org.secteur || "Secteur non renseigné"}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{TYPE_LABELS[org.type]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {org._count.contacts} contact(s) · {org._count.opportunities} opportunité(s)
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {organizations.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune organisation pour le moment.</p>
        )}
      </div>
    </div>
  );
}
