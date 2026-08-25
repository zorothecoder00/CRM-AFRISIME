import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForNiveau, stakeholderQuadrant } from "@/lib/status-tone";
import { StakeholderFormDialog } from "@/components/stakeholders/stakeholder-form-dialog";
import { Users as UsersIcon } from "lucide-react";

const NIVEAU_LABELS: Record<string, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
const POSITION_LABELS: Record<string, string> = { FAVORABLE: "Favorable", NEUTRE: "Neutre", OPPOSANT: "Opposant" };

/** Gestion des parties prenantes (cahier des charges V2.2 §21) — profil unique réutilisable sur plusieurs projets. */
export default async function PartiesPrenantesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PROJECT_UPDATE);

  const [stakeholders, users, contacts] = await Promise.all([
    prisma.stakeholder.findMany({
      include: { user: true, contact: true, responsable: true, _count: { select: { projects: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({ orderBy: { nom: "asc" }, select: { id: true, prenom: true, nom: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parties prenantes</h1>
          <p className="text-sm text-muted-foreground">
            {stakeholders.length} partie(s) prenante(s) — un profil unique par personne, réutilisable sur plusieurs projets.
          </p>
        </div>
        {canManage && (
          <StakeholderFormDialog
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            contacts={contacts.map((c) => ({ id: c.id, label: `${c.prenom} ${c.nom}` }))}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stakeholders.map((s) => (
          <Link key={s.id} href={`/parties-prenantes/${s.id}`}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  {s.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(s.user || s.contact) && (
                  <p className="text-sm text-muted-foreground">
                    {s.user ? `Collaborateur : ${s.user.name}` : `Contact externe : ${s.contact!.prenom} ${s.contact!.nom}`}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={toneForNiveau(s.influence)}>Influence : {NIVEAU_LABELS[s.influence]}</Badge>
                  <Badge variant={toneForNiveau(s.niveauEngagement)}>Engagement : {NIVEAU_LABELS[s.niveauEngagement]}</Badge>
                  {s.position && <Badge variant="outline">{POSITION_LABELS[s.position]}</Badge>}
                  <Badge variant="outline">{stakeholderQuadrant(s.influence, s.interet)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {s._count.projects} projet(s) associé(s)
                  {s.responsable && ` · Responsable : ${s.responsable.name}`}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {stakeholders.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune partie prenante pour le moment.</p>
        )}
      </div>
    </div>
  );
}
