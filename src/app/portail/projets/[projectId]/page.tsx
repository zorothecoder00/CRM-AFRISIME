import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForStatus, accentForStatus, toneForDeliverableStatus } from "@/lib/status-tone";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { isProjectAuthorized } from "@/lib/portal-authorization";
import { getOrganizationDevise } from "@/lib/currency";
import { FileText, CalendarClock } from "lucide-react";

const DELIVERABLE_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  SOUMIS: "Soumis",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

function formatMontant(montant: number | null) {
  if (montant === null) return null;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(montant);
}

/**
 * Détail projet du portail (cahier des charges §16-19) — page unique
 * réutilisée par Client/Partenaire ("projets communs") et Investisseur
 * ("projets autorisés"). Documents strictement filtrés partageExterne:true
 * (cahier des charges §19, isolation des données internes) : un document
 * de projet n'apparaît ici que s'il a été explicitement marqué partageable
 * par un membre interne, en plus d'appartenir à un projet autorisé.
 */
export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getPortalSession();
  if (!session) redirect("/portail/connexion");
  const devise = await getOrganizationDevise();

  const contact = await prisma.crmContact.findUnique({
    where: { id: session.contactId },
    include: { organization: true },
  });
  if (!contact) redirect("/portail/connexion");

  const authorized = await isProjectAuthorized(contact.id, projectId);
  if (!authorized) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      indicators: true,
      deliverables: { orderBy: { echeance: "asc" } },
      documents: { where: { partageExterne: true }, orderBy: { createdAt: "desc" } },
      events: { orderBy: { dateDebut: "asc" } },
    },
  });
  if (!project) notFound();

  const visibility = await computePortalNavVisibility(contact.id);

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
      maxWidthClassName="max-w-3xl"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{project.nom}</h1>
        <Badge variant={toneForStatus(project.statut)}>{project.statut.replace(/_/g, " ")}</Badge>
      </div>
      {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}

      <Card accent={accentForStatus(project.statut)}>
        <CardHeader>
          <CardTitle className="text-base">Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Avancement" value={`${project.avancement}%`} />
          <Info label="Échéance" value={project.dateFin ? project.dateFin.toLocaleDateString("fr-FR") : "—"} />
          {project.budget !== null && (
            <Info label="Budget" value={`${formatMontant(Number(project.budget))} ${devise}`} />
          )}
        </CardContent>
      </Card>

      {project.indicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.indicators.map((ind) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Livrables</CardTitle>
        </CardHeader>
        <CardContent>
          {project.deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun livrable pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {project.deliverables.map((d) => (
                <li key={d.id} className="rounded-md border bg-card px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{d.nom}</span>
                    <Badge variant={toneForDeliverableStatus(d.statut)}>
                      {DELIVERABLE_LABELS[d.statut] ?? d.statut}
                    </Badge>
                  </div>
                  {d.echeance && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Échéance : {d.echeance.toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {project.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document partagé pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {project.documents.map((doc) => (
                <li key={doc.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 hover:underline"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {doc.nom}
                    </span>
                    <span className="text-xs text-muted-foreground">{doc.createdAt.toLocaleDateString("fr-FR")}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {project.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.events.map((event) => (
                <li key={event.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
                  <span>{event.titre}</span>
                  <span className="text-xs text-muted-foreground">{event.dateDebut.toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PortalShell>
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
