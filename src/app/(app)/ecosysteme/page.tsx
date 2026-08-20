import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { portalLabelForContactType } from "@/lib/contact-portal-label";

const TYPE_LABELS: Record<string, string> = {
  CLIENT: "Clients",
  PROSPECT: "Prospects",
  PARTENAIRE: "Partenaires",
  FOURNISSEUR: "Fournisseurs",
  CONSULTANT: "Consultants",
  PRESTATAIRE: "Prestataires",
  CANDIDAT: "Candidats",
  MEMBRE: "Membres",
  INVESTISSEUR: "Investisseurs",
  COMMUNAUTE: "Communautés",
  AUTRE: "Autres",
};

// Ecosystem Management 3.0 (cahier des charges V3.0 §25) — la V2.2
// introduisait les portails externes, la V3 en fait un véritable écosystème :
// vue consolidée par type d'acteur (clients, fournisseurs, partenaires,
// investisseurs, institutions/bailleurs, consultants, communautés), avec
// leur espace sécurisé (portail) et leurs droits.
export default async function EcosystemePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.CRM_READ)) {
    redirect("/dashboard");
  }

  const contacts = await prisma.crmContact.findMany({
    where: { portalAccount: { isNot: null } },
    include: {
      organization: { select: { type: true, nom: true } },
      portalAccount: {
        select: {
          id: true,
          isActive: true,
          activatedAt: true,
          droitProjets: true,
          droitDocuments: true,
          droitTeleversement: true,
          droitMessages: true,
        },
      },
    },
    orderBy: { nom: "asc" },
  });

  const bailleurs = contacts.filter((c) => c.organization?.type === "INSTITUTION");
  const groups = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const key = c.type;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Écosystème</h1>
        <p className="text-sm text-muted-foreground">
          Clients, fournisseurs, partenaires, investisseurs, institutions/bailleurs, consultants, communautés — chacun
          avec son espace sécurisé, ses projets, ses documents, ses interactions et ses droits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{contacts.length}</p>
            <p className="text-xs text-muted-foreground">Acteurs avec accès portail</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{contacts.filter((c) => c.portalAccount?.isActive).length}</p>
            <p className="text-xs text-muted-foreground">Accès actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{bailleurs.length}</p>
            <p className="text-xs text-muted-foreground">Bailleurs (institutions)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{groups.size}</p>
            <p className="text-xs text-muted-foreground">Types de participants représentés</p>
          </CardContent>
        </Card>
      </div>

      {Array.from(groups.entries()).map(([type, list]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base">
              {TYPE_LABELS[type] ?? type} ({list.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                <Link href={`/crm/contacts/${c.id}`} className="font-medium underline">
                  {c.prenom} {c.nom}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {portalLabelForContactType(c.type, c.organization?.type)}
                  {c.organization && ` — ${c.organization.nom}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant={c.portalAccount?.isActive ? "success" : "destructive"}>
                    {c.portalAccount?.isActive ? "Actif" : "Révoqué"}
                  </Badge>
                  {c.portalAccount?.droitProjets && <Badge variant="outline">Projets</Badge>}
                  {c.portalAccount?.droitDocuments && <Badge variant="outline">Documents</Badge>}
                  {c.portalAccount?.droitTeleversement && <Badge variant="outline">Téléversement</Badge>}
                  {c.portalAccount?.droitMessages && <Badge variant="outline">Messagerie</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun acteur externe n&apos;a encore d&apos;accès portail. Créez-en un depuis une fiche contact CRM.
        </p>
      )}
    </div>
  );
}
