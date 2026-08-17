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
import { getAuthorizedProjectIds } from "@/lib/portal-authorization";

/**
 * Vue "Mes projets"/"Portefeuille" (cahier des charges §17/§19) — une seule
 * liste réutilisée par Partenaire et Investisseur, la restriction se faisant
 * uniquement via ProjectStakeholder.contactId (getAuthorizedProjectIds).
 */
export default async function PortalProjectsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const [projectIds, visibility] = await Promise.all([
    getAuthorizedProjectIds(contact.id),
    computePortalNavVisibility(contact.id),
  ]);

  const projects =
    projectIds.length > 0
      ? await prisma.project.findMany({ where: { id: { in: projectIds } }, orderBy: { updatedAt: "desc" } })
      : [];

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <h1 className="text-2xl font-semibold">Mes projets</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/portail/projets/${project.id}`}>
            <Card
              accent={accentForStatus(project.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{project.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={toneForStatus(project.statut)}>{project.statut.replace(/_/g, " ")}</Badge>
                <p className="text-sm text-muted-foreground">Avancement : {project.avancement}%</p>
                {project.dateFin && (
                  <p className="text-xs text-muted-foreground">
                    Échéance : {project.dateFin.toLocaleDateString("fr-FR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet accessible.</p>}
      </div>
    </PortalShell>
  );
}
