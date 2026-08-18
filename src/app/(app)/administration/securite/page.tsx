import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionList } from "@/components/security/session-list";

export default async function SecuritePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.SECURITY_AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManageSessions = session!.user.permissions.includes(PERMISSIONS.SESSION_MANAGE);

  const [logs, users, activeSessions] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, mfaEnabled: true, role: { select: { label: true } } },
      orderBy: { name: "asc" },
    }),
    canManageSessions
      ? prisma.userSession.findMany({
          where: { revokedAt: null },
          include: { user: { select: { name: true } } },
          orderBy: { lastSeenAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Sécurité</h1>
        <p className="text-sm text-muted-foreground">
          Journal d&apos;audit et état de la double authentification des utilisateurs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Double authentification (MFA)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>MFA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.role.label}</TableCell>
                  <TableCell>
                    <Badge variant={u.mfaEnabled ? "default" : "outline"}>
                      {u.mfaEnabled ? "Activée" : "Désactivée"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManageSessions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions actives ({activeSessions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionList
              sessions={activeSessions.map((s) => ({
                id: s.id,
                userName: s.user.name,
                userAgent: s.userAgent,
                ipAddress: s.ipAddress,
                createdAt: s.createdAt.toISOString(),
                lastSeenAt: s.lastSeenAt.toISOString(),
              }))}
              currentSessionId={session!.user.sessionId}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Journal d&apos;audit (50 derniers événements)</CardTitle>
          <Link href="/administration/audit">
            <Button variant="outline" size="sm">
              Journal complet &amp; filtres →
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
