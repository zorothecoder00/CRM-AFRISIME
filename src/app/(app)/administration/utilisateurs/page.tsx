import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserFormDialog } from "@/components/administration/user-form-dialog";
import { EditUserDialog } from "@/components/administration/edit-user-dialog";
import { ResetPasswordLinkButton } from "@/components/administration/reset-password-link-button";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Button } from "@/components/ui/button";

/** Options de departement indentees par profondeur, meme logique que la page Departements. */
function buildDepartmentOptions(
  departments: { id: string; name: string; parentId: string | null }[]
): { id: string; label: string }[] {
  const childrenByParent = new Map<string | null, typeof departments>();
  for (const d of departments) {
    const list = childrenByParent.get(d.parentId) ?? [];
    list.push(d);
    childrenByParent.set(d.parentId, list);
  }
  const options: { id: string; label: string }[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const d of childrenByParent.get(parentId) ?? []) {
      options.push({ id: d.id, label: `${"—".repeat(depth)} ${d.name}`.trim() });
      walk(d.id, depth + 1);
    }
  }
  walk(null, 0);
  return options;
}

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const { siteId } = await searchParams;

  const [users, roles, departments, postes, sites] = await Promise.all([
    prisma.user.findMany({
      where: siteId ? { siteId } : undefined,
      include: { role: true, department: true, posteRef: true, site: true, manager: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { label: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.poste.findMany({ orderBy: { nom: "asc" } }),
    prisma.site.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const departmentOptions = buildDepartmentOptions(departments);
  const posteOptions = postes.map((p) => ({ id: p.id, label: p.nom }));
  const siteOptions = sites.map((s) => ({ id: s.id, label: s.nom }));
  const managerOptions = users.map((u) => ({ id: u.id, label: u.name }));
  const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s)</p>
        </div>
        <UserFormDialog
          roles={roles.map((r) => ({ id: r.id, label: r.label }))}
          departments={departmentOptions}
          postes={posteOptions}
          sites={siteOptions}
          managers={managerOptions}
        />
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/administration/utilisateurs">
        <select name="siteId" defaultValue={siteId ?? ""} className={selectClass}>
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {siteId && (
          <Link href="/administration/utilisateurs">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.posteRef?.nom ?? user.poste ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role.label}</Badge>
                </TableCell>
                <TableCell>{user.department?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{user.site?.nom ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{user.manager?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "secondary" : "destructive"}>
                    {user.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditUserDialog
                      user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roleId: user.roleId,
                        departmentId: user.departmentId,
                        poste: user.poste,
                        posteId: user.posteId,
                        siteId: user.siteId,
                        managerId: user.managerId,
                      }}
                      roles={roles.map((r) => ({ id: r.id, label: r.label }))}
                      departments={departmentOptions}
                      postes={posteOptions}
                      sites={siteOptions}
                      managers={managerOptions}
                    />
                    <ResetPasswordLinkButton userId={user.id} userName={user.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
