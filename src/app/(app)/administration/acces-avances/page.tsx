import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, PERMISSION_CATALOG } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PermissionOverrideFormDialog } from "@/components/administration/permission-override-form-dialog";
import { DeletePermissionOverrideButton } from "@/components/administration/delete-permission-override-button";

const PERMISSION_LABELS = new Map<string, string>(PERMISSION_CATALOG.map((p) => [p.key, p.label]));

export default async function AccesAvancesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ROLES_MANAGE)) {
    redirect("/dashboard");
  }

  const [overrides, users, departments, projects, teams] = await Promise.all([
    prisma.permissionOverride.findMany({
      include: { user: true, department: true, project: true, team: true, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.team.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accès avancés</h1>
          <p className="text-sm text-muted-foreground">
            Dérogations ciblées par utilisateur, département, projet ou équipe — complètent la matrice par
            rôle (cahier des charges §19). Une dérogation « Refuser » l&apos;emporte toujours sur le rôle.
          </p>
        </div>
        <PermissionOverrideFormDialog
          users={users.map((u) => ({ id: u.id, label: u.name }))}
          permissions={PERMISSION_CATALOG}
          departments={departments.map((d) => ({ id: d.id, label: d.name }))}
          projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
          teams={teams.map((t) => ({ id: t.id, label: t.nom }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dérogations actives ({overrides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dérogation pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead>Effet</TableHead>
                  <TableHead>Créée par</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.user.name}</TableCell>
                    <TableCell className="text-sm">{PERMISSION_LABELS.get(o.permissionKey) ?? o.permissionKey}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.department
                        ? `Département : ${o.department.name}`
                        : o.project
                          ? `Projet : ${o.project.nom}`
                          : o.team
                            ? `Équipe : ${o.team.nom}`
                            : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.effect === "GRANT" ? "success" : "destructive"}>
                        {o.effect === "GRANT" ? "Accordé" : "Refusé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.createdBy.name}</TableCell>
                    <TableCell>
                      <DeletePermissionOverrideButton overrideId={o.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
