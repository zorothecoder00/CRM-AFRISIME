import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { getAuthorizedProgrammeIds } from "@/lib/portal-authorization";

/** Suivi des programmes financés (cahier des charges §20, portail Institution/Bailleur). */
export default async function PortalProgrammesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const [programmeIds, visibility] = await Promise.all([
    getAuthorizedProgrammeIds(contact.id),
    computePortalNavVisibility(contact.id),
  ]);

  const programmes =
    programmeIds.length > 0
      ? await prisma.programme.findMany({ where: { id: { in: programmeIds } }, orderBy: { updatedAt: "desc" } })
      : [];

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <h1 className="text-2xl font-semibold">Programmes</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {programmes.map((programme) => (
          <Link key={programme.id} href={`/portail/programmes/${programme.id}`}>
            <Card
              accent={accentForStatus(programme.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{programme.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={toneForStatus(programme.statut)}>{programme.statut.replace(/_/g, " ")}</Badge>
                {programme.objectif && <p className="text-sm text-muted-foreground">{programme.objectif}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
        {programmes.length === 0 && <p className="text-sm text-muted-foreground">Aucun programme accessible.</p>}
      </div>
    </PortalShell>
  );
}
