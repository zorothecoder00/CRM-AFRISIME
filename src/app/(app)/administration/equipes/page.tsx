import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { TeamFormDialog } from "@/components/administration/team-form-dialog";
import { DeleteTeamButton } from "@/components/administration/delete-team-button";
import { TeamMemberManager } from "@/components/administration/team-member-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EquipesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE)) {
    redirect("/dashboard");
  }

  const [teams, departments, users] = await Promise.all([
    prisma.team.findMany({
      include: { department: true, leader: true, members: { include: { user: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Équipes</h1>
          <p className="text-sm text-muted-foreground">
            Groupes de travail au sein d&apos;un département (cahier des charges §I) — distincts de la hiérarchie
            Direction/Département/Service.
          </p>
        </div>
        <TeamFormDialog
          departments={departments.map((d) => ({ id: d.id, label: d.name }))}
          users={users.map((u) => ({ id: u.id, label: u.name }))}
        />
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune équipe définie.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id} size="sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t.nom}</CardTitle>
                <DeleteTeamButton id={t.id} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{t.department.name}</Badge>
                  {t.leader && <Badge variant="secondary">Responsable : {t.leader.name}</Badge>}
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Membres ({t.members.length})</div>
                  <TeamMemberManager
                    teamId={t.id}
                    members={t.members.map((m) => ({ id: m.user.id, label: m.user.name }))}
                    availableUsers={users.map((u) => ({ id: u.id, label: u.name }))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
