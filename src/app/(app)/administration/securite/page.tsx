import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
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
import { withTenantScopedSession } from "@/lib/tenant-scoped-prisma";

export default async function SecuritePage() {
  const session = await getAppSession();
  if (!session!.user.permissions.includes(PERMISSIONS.SECURITY_AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManageSessions = session!.user.permissions.includes(PERMISSIONS.SESSION_MANAGE);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    logs,
    users,
    activeSessions,
    suspiciousActivity,
    permissionsOverview,
    retentionPoliciesActive,
    complianceNonConformesCount,
    pushDeliveryLogs,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    }),
    // Multi-tenant Phase 2 (User est l'une des deux tables couvertes par la
    // preuve de concept RLS, voir tenant-scoped-prisma.ts) — sans ce scope,
    // un admin d'une organisation verrait le statut MFA/push de TOUTES les
    // organisations de la plateforme, pas seulement la sienne.
    // roleId brut (pas de select imbriqué sur `role`) : Role n'est pas dans
    // COVERED_TABLES (scripts/lib/multi-tenant-tables.ts), le rôle Postgres
    // tenant-scope n'a aucun droit dessus — un join échouerait avec
    // "permission denied for table Role". Labels résolus séparément
    // ci-dessous via le client global (Role est un référentiel global, sans
    // organizationId, donc hors du périmètre à isoler).
    withTenantScopedSession(session!.user.organizationId, (tx) =>
      tx.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          mfaEnabled: true,
          roleId: true,
        },
        orderBy: { name: "asc" },
      })
    ),
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
    // Tentatives d'envoi externe journalisées par attemptExternalDelivery
    // (src/lib/notify.ts, action "notification.external_delivery_attempted") —
    // seule trace existante d'un succès/échec d'envoi push, jamais consultée
    // côté admin jusqu'ici (sendPush() retournait { sent: false, reason }
    // sans que personne ne le lise).
    prisma.auditLog.findMany({
      where: { action: "notification.external_delivery_attempted", createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, changes: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Même raison que roleId ci-dessus : PushSubscription n'est pas dans
  // COVERED_TABLES, requête séparée via le client global, restreinte aux
  // utilisateurs déjà scopés.
  const [pushCounts, roles] = await Promise.all([
    prisma.pushSubscription.groupBy({
      by: ["userId"],
      where: { userId: { in: users.map((u) => u.id) } },
      _count: { _all: true },
    }),
    prisma.role.findMany({ select: { id: true, label: true } }),
  ]);
  const pushCountByUser = new Map(pushCounts.map((p) => [p.userId, p._count._all]));
  const roleLabelById = new Map(roles.map((r) => [r.id, r.label]));

  const pushAdoptionCount = users.filter((u) => (pushCountByUser.get(u.id) ?? 0) > 0).length;

  const pushDeliveryResults = pushDeliveryLogs.flatMap((log) => {
    const changes = log.changes as { titre?: string; results?: { channel: string; sent: boolean; reason?: string }[] } | null;
    return (changes?.results ?? [])
      .filter((r) => r.channel === "PUSH")
      .map((r) => ({ createdAt: log.createdAt, userName: log.user?.name, titre: changes?.titre, ...r }));
  });
  const pushAttemptsCount = pushDeliveryResults.length;
  const pushFailures = pushDeliveryResults.filter((r) => !r.sent);
  const pushFailuresCount = pushFailures.length;

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications push</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {pushAdoptionCount}/{users.length} utilisateur(s) actif(s) ont activé le push sur au moins un appareil
            </p>
            {users.length > 0 && (
              <Badge variant={pushAdoptionCount === 0 ? "outline" : "default"}>
                {Math.round((pushAdoptionCount / users.length) * 100)}% d&apos;adoption
              </Badge>
            )}
            {pushAttemptsCount > 0 ? (
              <p>
                <Badge variant={pushFailuresCount > 0 ? "destructive" : "default"}>
                  {pushFailuresCount} échec{pushFailuresCount > 1 ? "s" : ""} d&apos;envoi
                </Badge>{" "}
                sur {pushAttemptsCount} tentative{pushAttemptsCount > 1 ? "s" : ""} (30 derniers jours)
              </p>
            ) : (
              <p className="text-muted-foreground">Aucune tentative d&apos;envoi push sur les 30 derniers jours.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Double authentification (MFA) &amp; notifications push</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Push</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const pushCount = pushCountByUser.get(u.id) ?? 0;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{roleLabelById.get(u.roleId) ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.mfaEnabled ? "default" : "outline"}>
                        {u.mfaEnabled ? "Activée" : "Désactivée"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pushCount > 0 ? (
                        <Badge variant="default">
                          {pushCount} appareil{pushCount > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Aucun</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pushFailuresCount > 0 && (
        <Card accent="destructive">
          <CardHeader>
            <CardTitle className="text-base">
              Échecs d&apos;envoi push (30 derniers jours) — {pushFailuresCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pushFailures.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {f.createdAt.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell>{f.userName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.titre ?? "—"}</TableCell>
                    <TableCell className="text-sm">{f.reason ?? "Raison non précisée."}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
