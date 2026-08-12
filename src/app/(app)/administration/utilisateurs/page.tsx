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
import { AdminTabs } from "@/components/administration/admin-tabs";

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

export default async function UtilisateursPage() {
  const [users, roles, departments] = await Promise.all([
    prisma.user.findMany({
      include: { role: true, department: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { label: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const departmentOptions = buildDepartmentOptions(departments);

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
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-muted-foreground">{user.poste ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role.label}</Badge>
                </TableCell>
                <TableCell>{user.department?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "secondary" : "destructive"}>
                    {user.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
