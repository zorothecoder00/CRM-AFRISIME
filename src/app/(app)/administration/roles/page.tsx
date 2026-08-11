import { Fragment } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, PERMISSION_CATALOG } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { RolePermissionCheckbox } from "@/components/administration/role-permission-checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ROLES_MANAGE);

  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { label: "asc" },
  });

  const categories = Array.from(new Set(PERMISSION_CATALOG.map((p) => p.category)));

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Rôles &amp; permissions</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Cochez/décochez pour personnaliser les droits de chaque rôle."
            : "Matrice en lecture."}{" "}
          {roles.length} rôle(s), {PERMISSION_CATALOG.length} permission(s).
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Permission</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  {role.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <Fragment key={category}>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={roles.length + 1} className="text-xs font-semibold uppercase text-muted-foreground">
                    {category}
                  </TableCell>
                </TableRow>
                {PERMISSION_CATALOG.filter((p) => p.category === category).map((perm) => (
                  <TableRow key={perm.key}>
                    <TableCell className="text-sm">{perm.label}</TableCell>
                    {roles.map((role) => {
                      const has = role.permissions.some((rp) => rp.permission.key === perm.key);
                      return (
                        <TableCell key={role.id} className="text-center">
                          {canManage ? (
                            <RolePermissionCheckbox
                              roleId={role.id}
                              permissionKey={perm.key}
                              initialChecked={has}
                              disabled={role.key === "SUPER_ADMIN"}
                            />
                          ) : (
                            has && <span className="text-primary">✓</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
