import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForOpportunityStatus, accentForOpportunityStatus, toneForStatus, accentForStatus } from "@/lib/status-tone";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { getOrganizationDevise } from "@/lib/currency";
import { getAuthorizedProjectIds } from "@/lib/portal-authorization";
import { CalendarClock, Sparkles } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU: "Nouveau",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNEE: "Gagnée",
  PERDUE: "Perdue",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_REVISION: "En révision",
  BLOQUEE: "Bloquée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

function formatMontant(montant: number | null) {
  if (montant === null) return null;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

type Echeance = { key: string; label: string; date: Date; href: string; kind: string };

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const devise = await getOrganizationDevise();

  const orConditions: Prisma.CrmOpportunityWhereInput[] = [{ contactId: contact.id }];
  if (contact.organizationId) {
    orConditions.push({ organizationId: contact.organizationId });
  }

  const [opportunities, missions, projectIds, visibility] = await Promise.all([
    prisma.crmOpportunity.findMany({ where: { OR: orConditions }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({
      where: { externalContactId: contact.id },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    getAuthorizedProjectIds(contact.id),
    computePortalNavVisibility(contact.id),
  ]);

  const [projects, deliverables, pendingMeetings] = await Promise.all([
    projectIds.length > 0
      ? prisma.project.findMany({ where: { id: { in: projectIds } }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.projectDeliverable.findMany({
          where: { projectId: { in: projectIds }, echeance: { not: null } },
          include: { project: true },
        })
      : Promise.resolve([]),
    prisma.meetingExternalParticipant.findMany({
      where: { contactId: contact.id, rsvp: "EN_ATTENTE" },
      include: { meeting: true },
      orderBy: { meeting: { dateHeure: "asc" } },
    }),
  ]);

  // Fil unique d'échéances (comble le trou commun à §16/§18) : missions,
  // livrables de projet autorisés et invitations de réunion en attente,
  // fusionnés et triés par date plutôt qu'affichés en 3 blocs disjoints.
  const echeances: Echeance[] = [
    ...missions
      .filter((m) => m.echeance)
      .map((m) => ({
        key: `mission-${m.id}`,
        label: `Mission — ${m.titre}`,
        date: m.echeance!,
        href: `/portail/missions/${m.id}`,
        kind: "Mission",
      })),
    ...deliverables.map((d) => ({
      key: `deliverable-${d.id}`,
      label: `Livrable — ${d.nom} (${d.project.nom})`,
      date: d.echeance!,
      href: `/portail/projets/${d.projectId}`,
      kind: "Livrable",
    })),
    ...pendingMeetings.map((p) => ({
      key: `meeting-${p.id}`,
      label: `Réunion — ${p.meeting.titre}`,
      date: p.meeting.dateHeure,
      href: "/portail/reunions",
      kind: "Réunion",
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <div>
        <h1 className="text-2xl font-semibold">Bonjour {contact.prenom}</h1>
        <p className="text-sm text-muted-foreground">
          {contact.organization ? contact.organization.nom : "Suivi de votre relation avec AfriSime."}
        </p>
      </div>

      {/* IA d'assistance client (cahier des charges V3.0 §52, "Role-Based AI" —
          le portail externe n'a pas de moteur conversationnel dédié comme
          §41, mais applique le même principe qu'ailleurs dans l'app : un
          résumé proactif plutôt qu'une recherche manuelle, cf. "Votre
          journée" §50) — réutilise des données déjà chargées ci-dessus. */}
      {(echeances.length > 0 || visibility.unreadMessages > 0) && (
        <Card accent="info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Votre assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {echeances.length > 0 && <Badge variant="info">{echeances.length} échéance(s) à venir</Badge>}
            {visibility.unreadMessages > 0 && (
              <Link href="/portail/messages">
                <Badge variant="warning">{visibility.unreadMessages} message(s) non lu(s)</Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {echeances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Mes échéances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {echeances.slice(0, 8).map((e) => (
                <li key={e.key}>
                  <Link
                    href={e.href}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>
                      <Badge variant="secondary" className="mr-2">
                        {e.kind}
                      </Badge>
                      {e.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.date.toLocaleDateString("fr-FR")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Mes projets</h2>
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {missions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Mes missions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {missions.map((mission) => (
              <Link key={mission.id} href={`/portail/missions/${mission.id}`}>
                <Card
                  accent={accentForStatus(mission.statut)}
                  className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{mission.titre}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge variant={toneForStatus(mission.statut)}>
                      {TASK_STATUS_LABELS[mission.statut] ?? mission.statut}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{mission.project.nom}</p>
                    {mission.echeance && (
                      <p className="text-xs text-muted-foreground">
                        Échéance : {mission.echeance.toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {opportunities.map((opportunity) => (
          <Link key={opportunity.id} href={`/portail/opportunites/${opportunity.id}`}>
            <Card
              accent={accentForOpportunityStatus(opportunity.statut)}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{opportunity.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={toneForOpportunityStatus(opportunity.statut)}>
                  {STATUS_LABELS[opportunity.statut]}
                </Badge>
                {opportunity.montantEstime !== null && (
                  <p className="text-sm text-muted-foreground">
                    {formatMontant(Number(opportunity.montantEstime))} {devise}
                  </p>
                )}
                {opportunity.dateClotureEstimee && (
                  <p className="text-xs text-muted-foreground">
                    Clôture estimée : {opportunity.dateClotureEstimee.toLocaleDateString("fr-FR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {opportunities.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune opportunité pour le moment.</p>
        )}
      </div>
    </PortalShell>
  );
}
