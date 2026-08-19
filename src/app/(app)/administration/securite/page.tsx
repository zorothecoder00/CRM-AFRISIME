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
import { detectSuspiciousActivity, computePermissionsOverview } from "@/lib/security-trust-center";

export default async function SecuritePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.SECURITY_AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManageSessions = session!.user.permissions.includes(PERMISSIONS.SESSION_MANAGE);

  const [logs, users, activeSessions, suspiciousActivity, permissionsOverview, retentionPoliciesActive, complianceNonConformesCount] =
    await Promise.all([
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
    detectSuspiciousActivity(),
    computePermissionsOverview(),
    prisma.retentionPolicy.count({ where: { isActive: true } }),
    prisma.complianceObligation.count({ where: { statut: "NON_CONFORME" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Centre de sécurité</h1>
        <p className="text-sm text-muted-foreground">
          Security & Trust Center (cahier des charges V3.0 §44) — sécurité, sessions, appareils, connexions,
          permissions, audit, activités suspectes, politiques, conformité.
        </p>
      </div>

      {suspiciousActivity.length > 0 && (
        <Card accent="destructive">
          <CardHeader>
            <CardTitle className="text-base">Activités suspectes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suspiciousActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={a.severity}>{a.type === "LOGIN_FAILED" ? "Connexion" : "IP multiples"}</Badge>
                <span>{a.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{permissionsOverview.roleCount} rôle(s) définis</p>
            <p>{permissionsOverview.overridesCount} dérogation(s) de permission</p>
            {permissionsOverview.usersWithoutMfaCount > 0 && (
              <Badge variant="warning">{permissionsOverview.usersWithoutMfaCount} utilisateur(s) sans MFA</Badge>
            )}
            <Link href="/administration/roles" className="block text-xs text-primary underline">
              Gérer les rôles →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Politiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{retentionPoliciesActive} politique(s) de rétention active(s)</p>
            <Link href="/administration/donnees" className="block text-xs text-primary underline">
              Gérer les politiques →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conformité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {complianceNonConformesCount > 0 ? (
              <Badge variant="destructive">{complianceNonConformesCount} obligation(s) non conforme(s)</Badge>
            ) : (
              <p className="text-muted-foreground">Aucune non-conformité active.</p>
            )}
            <Link href="/conformite" className="block text-xs text-primary underline">
              Voir la conformité →
            </Link>
          </CardContent>
        </Card>
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
