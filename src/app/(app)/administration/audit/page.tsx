import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.SECURITY_AUDIT_READ)) {
    redirect("/dashboard");
  }

  const { userId, entityType, action, dateFrom, dateTo, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditLogWhereInput = {
    userId: userId || undefined,
    entityType: entityType || undefined,
    action: action ? { contains: action, mode: "insensitive" } : undefined,
    createdAt:
      dateFrom || dateTo
        ? { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
        : undefined,
  };

  const [logs, total, users, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!userId || !!entityType || !!action || !!dateFrom || !!dateTo;
  const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(p));
    return `/administration/audit?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Journal d&apos;audit</h1>
        <p className="text-sm text-muted-foreground">
          Vue transversale de toutes les actions journalisées (cahier des charges §18/§23). {total} événement(s).
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/administration/audit">
        <select name="userId" defaultValue={userId ?? ""} className={selectClass}>
          <option value="">Tous les utilisateurs</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select name="entityType" defaultValue={entityType ?? ""} className={selectClass}>
          <option value="">Toutes les entités</option>
          {entityTypes.map((e) => (
            <option key={e.entityType} value={e.entityType}>
              {e.entityType}
            </option>
          ))}
        </select>
        <Input name="action" placeholder="Action (ex: task.created)" defaultValue={action} className="max-w-[220px]" />
        <input type="date" name="dateFrom" defaultValue={dateFrom} className={selectClass} />
        <input type="date" name="dateTo" defaultValue={dateTo} className={selectClass} />
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {hasFilters && (
          <Link href="/administration/audit">
            <Button type="button" variant="ghost">
              Réinitialiser
            </Button>
          </Link>
        )}
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Événements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {log.createdAt.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell>{log.user?.name ?? "—"}</TableCell>
                  <TableCell>
                    <code className="text-xs">{log.action}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.entityType} · {log.entityId}
                  </TableCell>
                  <TableCell>
                    {log.changes ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-primary">Voir</summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Aucun événement pour ces filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)}>
                    <Button variant="outline" size="sm">
                      Précédent
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)}>
                    <Button variant="outline" size="sm">
                      Suivant
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
