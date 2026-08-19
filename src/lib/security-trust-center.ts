import { prisma } from "@/lib/prisma";

// Security & Trust Center (cahier des charges V3.0 §44) — "sécurité,
// sessions, appareils, connexions" étaient déjà couverts par
// /administration/securite (MFA, UserSession, AuditLog). Ce module ajoute
// les 4 facettes manquantes de la liste du cahier : permissions, activités
// suspectes, politiques, conformité. "Politiques" reste un renvoi vers
// /administration/donnees (RetentionPolicy, déjà géré là) plutôt qu'une
// duplication d'UI ; "conformité" a sa propre page (/conformite).

const SUSPICIOUS_WINDOW_MS = 24 * 60 * 60 * 1000;
const FAILED_LOGIN_THRESHOLD = 3;
const MULTI_IP_THRESHOLD = 3;

export type SuspiciousActivity = {
  type: "LOGIN_FAILED" | "MULTI_IP";
  description: string;
  severity: "warning" | "destructive";
};

/**
 * Détection d'activités suspectes — heuristiques déterministes sur
 * AuditLog/UserSession (pas de modèle de détection d'anomalies, comme les
 * autres modules "IA" de cette instance) : tentatives de connexion
 * échouées répétées (auth.login_failed, déjà journalisé par next-auth) et
 * connexions depuis de nombreuses adresses IP différentes en 24h.
 */
export async function detectSuspiciousActivity(): Promise<SuspiciousActivity[]> {
  const since = new Date(Date.now() - SUSPICIOUS_WINDOW_MS);

  const [failedLogins, sessions] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: "auth.login_failed", createdAt: { gte: since } },
      select: { entityId: true },
    }),
    prisma.userSession.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true, ipAddress: true, user: { select: { name: true } } },
    }),
  ]);

  const activities: SuspiciousActivity[] = [];

  const failedByEmail = new Map<string, number>();
  for (const f of failedLogins) failedByEmail.set(f.entityId, (failedByEmail.get(f.entityId) ?? 0) + 1);
  for (const [email, count] of failedByEmail) {
    if (count >= FAILED_LOGIN_THRESHOLD) {
      activities.push({
        type: "LOGIN_FAILED",
        description: `${count} tentative(s) de connexion échouée(s) pour ${email} sur les dernières 24h.`,
        severity: count >= FAILED_LOGIN_THRESHOLD * 2 ? "destructive" : "warning",
      });
    }
  }

  const ipsByUser = new Map<string, Set<string>>();
  const nameByUser = new Map<string, string>();
  for (const s of sessions) {
    if (!s.ipAddress) continue;
    nameByUser.set(s.userId, s.user.name);
    const set = ipsByUser.get(s.userId) ?? new Set<string>();
    set.add(s.ipAddress);
    ipsByUser.set(s.userId, set);
  }
  for (const [userId, ips] of ipsByUser) {
    if (ips.size >= MULTI_IP_THRESHOLD) {
      activities.push({
        type: "MULTI_IP",
        description: `${nameByUser.get(userId)} s'est connecté depuis ${ips.size} adresses IP différentes sur les dernières 24h.`,
        severity: "warning",
      });
    }
  }

  return activities.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "destructive" ? -1 : 1));
}

export type PermissionsOverview = {
  roleCount: number;
  overridesCount: number;
  usersWithoutMfaCount: number;
};

/** Vue d'ensemble "permissions" du Trust Center — agrège des données déjà gérées ailleurs (/administration/roles, /acces-avances). */
export async function computePermissionsOverview(): Promise<PermissionsOverview> {
  const [roleCount, overridesCount, usersWithoutMfaCount] = await Promise.all([
    prisma.role.count(),
    prisma.permissionOverride.count(),
    prisma.user.count({ where: { isActive: true, mfaEnabled: false } }),
  ]);
  return { roleCount, overridesCount, usersWithoutMfaCount };
}
