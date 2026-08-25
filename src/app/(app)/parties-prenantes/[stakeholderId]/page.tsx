import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForNiveau, stakeholderQuadrant } from "@/lib/status-tone";
import { StakeholderFormDialog } from "@/components/stakeholders/stakeholder-form-dialog";
import { StakeholderProjectsSection } from "@/components/stakeholders/stakeholder-projects-section";
import { StakeholderCommunications } from "@/components/stakeholders/stakeholder-communications";
import { Users as UsersIcon, AlertTriangle } from "lucide-react";

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const POSITION_LABELS: Record<string, string> = { FAVORABLE: "Favorable", NEUTRE: "Neutre", OPPOSANT: "Opposant" };

export default async function StakeholderDetailPage({
  params,
}: {
  params: Promise<{ stakeholderId: string }>;
}) {
  const { stakeholderId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);

  const [stakeholder, users, contacts, allProjects] = await Promise.all([
    prisma.stakeholder.findUnique({
      where: { id: stakeholderId },
      include: {
        user: true,
        contact: true,
        responsable: true,
        projects: { include: { project: true }, orderBy: { createdAt: "asc" } },
        communications: { include: { author: true }, orderBy: { date: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  if (!stakeholder) {
    notFound();
  }

  const linkedProjectIds = new Set(stakeholder.projects.map((p) => p.projectId));
  const availableProjects = allProjects
    .filter((p) => !linkedProjectIds.has(p.id))
    .map((p) => ({ id: p.id, label: p.nom }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <UsersIcon className="h-6 w-6 text-muted-foreground" />
              {stakeholder.nom}
            </h1>
            {(stakeholder.user || stakeholder.contact) && (
              <p className="text-sm text-muted-foreground">
                {stakeholder.user
                  ? `Collaborateur : ${stakeholder.user.name}`
                  : `Contact externe : ${stakeholder.contact!.prenom} ${stakeholder.contact!.nom}`}
              </p>
            )}
          </div>
          {canManage && (
            <StakeholderFormDialog
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
              stakeholder={{
                id: stakeholder.id,
                nom: stakeholder.nom,
                userId: stakeholder.userId,
                contactId: stakeholder.contactId,
                influence: stakeholder.influence,
                interet: stakeholder.interet,
                niveauEngagement: stakeholder.niveauEngagement,
                position: stakeholder.position,
                relation: stakeholder.relation,
                categorie: stakeholder.categorie,
                organisation: stakeholder.organisation,
                attentes: stakeholder.attentes,
                strategieEngagement: stakeholder.strategieEngagement,
                responsableId: stakeholder.responsableId,
                risquesRelationnels: stakeholder.risquesRelationnels,
                notes: stakeholder.notes,
              }}
            />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projets associés</CardTitle>
          </CardHeader>
          <CardContent>
            <StakeholderProjectsSection
              stakeholderId={stakeholder.id}
              projects={stakeholder.projects.map((link) => ({
                linkId: link.id,
                projectId: link.project.id,
                projectNom: link.project.nom,
                role: link.role,
              }))}
              availableProjects={availableProjects}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <StakeholderCommunications
              stakeholderId={stakeholder.id}
              communications={stakeholder.communications.map((c) => ({
                id: c.id,
                date: c.date.toISOString(),
                canal: c.canal,
                resume: c.resume,
                authorName: c.author.name,
              }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={toneForNiveau(stakeholder.influence)}>Influence : {NIVEAU_LABELS[stakeholder.influence]}</Badge>
              <Badge variant={toneForNiveau(stakeholder.interet)}>Intérêt : {NIVEAU_LABELS[stakeholder.interet]}</Badge>
              <Badge variant={toneForNiveau(stakeholder.niveauEngagement)}>
                Engagement : {NIVEAU_LABELS[stakeholder.niveauEngagement]}
              </Badge>
              {stakeholder.position && <Badge variant="outline">{POSITION_LABELS[stakeholder.position]}</Badge>}
              <Badge variant="outline">
                Matrice : {stakeholderQuadrant(stakeholder.influence, stakeholder.interet)}
              </Badge>
            </div>
            {stakeholder.categorie && (
              <div>
                <div className="text-xs text-muted-foreground">Catégorie</div>
                <div>{stakeholder.categorie}</div>
              </div>
            )}
            {stakeholder.organisation && (
              <div>
                <div className="text-xs text-muted-foreground">Organisation</div>
                <div>{stakeholder.organisation}</div>
              </div>
            )}
            {stakeholder.relation && (
              <div>
                <div className="text-xs text-muted-foreground">Nature de la relation</div>
                <div>{stakeholder.relation}</div>
              </div>
            )}
            {stakeholder.attentes && (
              <div>
                <div className="text-xs text-muted-foreground">Attentes</div>
                <p className="whitespace-pre-wrap">{stakeholder.attentes}</p>
              </div>
            )}
            {stakeholder.strategieEngagement && (
              <div>
                <div className="text-xs text-muted-foreground">Stratégie d&apos;engagement</div>
                <p className="whitespace-pre-wrap">{stakeholder.strategieEngagement}</p>
              </div>
            )}
            {stakeholder.responsable && (
              <div>
                <div className="text-xs text-muted-foreground">Responsable interne</div>
                <div>{stakeholder.responsable.name}</div>
              </div>
            )}
            {stakeholder.notes && (
              <div>
                <div className="text-xs text-muted-foreground">Notes</div>
                <p className="whitespace-pre-wrap">{stakeholder.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {stakeholder.risquesRelationnels && (
          <Card accent="destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Risques relationnels
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="whitespace-pre-wrap">{stakeholder.risquesRelationnels}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
