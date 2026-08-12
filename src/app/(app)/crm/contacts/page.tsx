import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accentForContactType } from "@/lib/status-tone";
import { ContactFormDialog } from "@/components/crm/contact-form-dialog";

const TYPE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  PROSPECT: "Prospect",
  PARTENAIRE: "Partenaire",
  FOURNISSEUR: "Fournisseur",
  CONSULTANT: "Consultant",
  PRESTATAIRE: "Prestataire",
  CANDIDAT: "Candidat",
  MEMBRE: "Membre",
  AUTRE: "Autre",
};

export default async function CrmContactsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.CRM_MANAGE);

  const [contacts, organizations] = await Promise.all([
    prisma.crmContact.findMany({
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.crmOrganization.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contact(s)</p>
        </div>
        {canManage && (
          <ContactFormDialog organizations={organizations.map((o) => ({ id: o.id, label: o.nom }))} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts.map((contact) => (
          <Link key={contact.id} href={`/crm/contacts/${contact.id}`}>
            <Card
              accent={accentForContactType(contact.type)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">
                  {contact.prenom} {contact.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {contact.fonction || "Fonction non renseignée"}
                  {contact.organization && ` · ${contact.organization.nom}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{TYPE_LABELS[contact.type]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{contact.email || "Pas d'email"}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun contact pour le moment.</p>
        )}
      </div>
    </div>
  );
}
