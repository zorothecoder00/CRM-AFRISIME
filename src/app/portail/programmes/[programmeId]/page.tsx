import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus } from "@/lib/status-tone";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { getAuthorizedProjectIds, isProgrammeAuthorized } from "@/lib/portal-authorization";
import { getOrganizationDevise } from "@/lib/currency";
import { Users, CalendarClock } from "lucide-react";

function formatMontant(montant: number | null) {
  if (montant === null) return null;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

/**
 * Détail programme (cahier des charges §20, portail Institution/Bailleur) —
 * seuls les projets du programme sur lesquels le contact est
 * ProjectStakeholder sont listés/agrégés, jamais l'ensemble du programme.
 */
export default async function PortalProgrammeDetailPage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");
  const devise = await getOrganizationDevise();

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const authorized = await isProgrammeAuthorized(contact.id, programmeId);
  if (!authorized) notFound();

  const programme = await prisma.programme.findUnique({
    where: { id: programmeId },
    include: { beneficiaires: { orderBy: { createdAt: "desc" } } },
  });
  if (!programme) notFound();

  const authorizedProjectIds = await getAuthorizedProjectIds(contact.id);
  const programmeProjects = await prisma.project.findMany({
    where: { id: { in: authorizedProjectIds }, programmeId },
    include: { indicators: true, deliverables: { where: { echeance: { not: null } } } },
    orderBy: { updatedAt: "desc" },
  });

  const indicators = programmeProjects.flatMap((p) => p.indicators);
  const echeances = programmeProjects
    .flatMap((p) => p.deliverables.map((d) => ({ ...d, projectNom: p.nom })))
    .sort((a, b) => a.echeance!.getTime() - b.echeance!.getTime());

  const visibility = await computePortalNavVisibility(contact.id);

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{programme.nom}</h1>
        <Badge variant={toneForStatus(programme.statut)}>{programme.statut.replace(/_/g, " ")}</Badge>
      </div>
      {programme.objectif && <p className="text-sm text-muted-foreground">{programme.objectif}</p>}
      {programme.budget !== null && (
        <p className="text-sm text-muted-foreground">Budget : {formatMontant(Number(programme.budget))} {devise}</p>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Projets</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {programmeProjects.map((project) => (
            <Link key={project.id} href={`/portail/projets/${project.id}`}>
              <Card
                accent={accentForStatus(project.statut)}
                className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
              >
                <CardHeader>
                  <CardTitle className="text-base">{project.nom}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={toneForStatus(project.statut)}>{project.statut.replace(/_/g, " ")}</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">Avancement : {project.avancement}%</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {programmeProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun projet accessible pour ce programme.</p>
          )}
        </div>
      </div>

      {indicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {indicators.map((ind) => (
                <li key={ind.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
                  <span>{ind.nom}</span>
                  <span className="text-muted-foreground">
                    {Number(ind.valeurActuelle)} / {Number(ind.valeurCible)} {ind.unite ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {echeances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Échéances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {echeances.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
                  <span>
                    {d.nom} <span className="text-muted-foreground">({d.projectNom})</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{d.echeance!.toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Bénéficiaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          {programme.beneficiaires.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bénéficiaire enregistré.</p>
          ) : (
            <ul className="space-y-2">
              {programme.beneficiaires.map((b) => (
                <li key={b.id} className="rounded-md border bg-card px-3 py-2 text-sm">
                  <p className="font-medium">{b.nom}</p>
                  {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
