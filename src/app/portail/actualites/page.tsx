import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { portalLabelForContactType } from "@/lib/contact-portal-label";
import { PortalShell } from "@/components/portal/portal-shell";
import { computePortalNavVisibility } from "@/lib/portal-nav-visibility";
import { getAuthorizedProjectIds } from "@/lib/portal-authorization";
import { Newspaper } from "lucide-react";

type NewsItem = { key: string; label: string; date: Date; kind: string };

/**
 * Fil "actualités" (cahier des charges §19/§20) — dérivé des données réelles
 * (avancement projet via MetricSnapshot déjà alimenté quotidiennement,
 * décisions de réunion, livrables validés) sur les seuls projets autorisés,
 * pas un contenu rédigé/stocké séparément.
 */
export default async function PortalNewsPage() {
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

  const [projects, snapshots, decisions, deliverables] =
    projectIds.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, nom: true } }),
          prisma.metricSnapshot.findMany({
            where: { entityType: "Project", entityId: { in: projectIds }, metric: "avancement" },
            orderBy: { capturedAt: "desc" },
            take: 20,
          }),
          prisma.meetingDecision.findMany({
            where: { projectId: { in: projectIds } },
            include: { project: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
          prisma.projectDeliverable.findMany({
            where: { projectId: { in: projectIds }, statut: "VALIDE" },
            include: { project: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
        ]);

  const projectNom = new Map(projects.map((p) => [p.id, p.nom]));

  const news: NewsItem[] = [
    ...snapshots.map((s) => ({
      key: `snapshot-${s.id}`,
      label: `Avancement du projet ${projectNom.get(s.entityId) ?? ""} : ${Number(s.valeur)}%`,
      date: s.capturedAt,
      kind: "Avancement",
    })),
    ...decisions
      .filter((d) => d.project)
      .map((d) => ({
        key: `decision-${d.id}`,
        label: `Décision — ${d.project!.nom} : ${d.description}`,
        date: d.createdAt,
        kind: "Décision",
      })),
    ...deliverables.map((d) => ({
      key: `deliverable-${d.id}`,
      label: `Livrable validé — ${d.nom} (${d.project.nom})`,
      date: d.updatedAt,
      kind: "Livrable",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <PortalShell
      name={`${contact.prenom} ${contact.nom}`}
      email={session.email}
      label={portalLabelForContactType(contact.type, contact.organization?.type)}
      visibility={visibility}
    >
      <h1 className="text-2xl font-semibold">Actualités</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4" />
            Derniers événements sur vos projets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune actualité pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {news.slice(0, 30).map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                  <span>
                    <Badge variant="secondary" className="mr-2">
                      {item.kind}
                    </Badge>
                    {item.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.date.toLocaleDateString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
