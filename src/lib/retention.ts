import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { PERMISSIONS } from "@/lib/permissions";
import { TRASH_RETENTION_DAYS } from "@/lib/trash";

export type RetentionEnforcementResult = { dataType: string; deleted: number }[];

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Application des politiques de rétention (cahier des charges V2.2 §37).
 * Bornée aux 4 types de données sans risque de cascade FK — AuditLog,
 * Notification (lues uniquement — une notification non lue reste utile
 * quel que soit son âge), IntegrationEvent, MetricSnapshot. Suppression
 * réelle (pas une corbeille) : ce sont des journaux/événements, pas des
 * objets métier qu'un utilisateur pourrait vouloir restaurer.
 *
 * La corbeille (Project/Task/Document) N'EST PAS purgée ici — voir le
 * commentaire en tête de src/actions/trash.actions.ts : aucune de ces
 * entités n'a de relation en onDelete: Cascade, une purge automatique
 * échouerait ou détruirait un sous-arbre selon le cas. `notifyTrashOverdue`
 * ci-dessous envoie un rappel aux titulaires de TRASH_MANAGE à la place.
 */
export async function enforceRetentionPolicies(): Promise<RetentionEnforcementResult> {
  const policies = await prisma.retentionPolicy.findMany({ where: { isActive: true } });
  const results: RetentionEnforcementResult = [];

  for (const policy of policies) {
    const before = cutoff(policy.retentionDays);

    if (policy.dataType === "AUDIT_LOG") {
      const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: before } } });
      results.push({ dataType: policy.dataType, deleted: count });
    } else if (policy.dataType === "NOTIFICATION") {
      const { count } = await prisma.notification.deleteMany({ where: { isRead: true, createdAt: { lt: before } } });
      results.push({ dataType: policy.dataType, deleted: count });
    } else if (policy.dataType === "INTEGRATION_EVENT") {
      const { count } = await prisma.integrationEvent.deleteMany({ where: { receivedAt: { lt: before } } });
      results.push({ dataType: policy.dataType, deleted: count });
    } else if (policy.dataType === "METRIC_SNAPSHOT") {
      const { count } = await prisma.metricSnapshot.deleteMany({ where: { capturedAt: { lt: before } } });
      results.push({ dataType: policy.dataType, deleted: count });
    }
    // TRASH : géré séparément par notifyTrashOverdue, jamais supprimé ici.
  }

  return results;
}

/** Rappel (pas de suppression) — notifie les titulaires de TRASH_MANAGE que des éléments dépassent le seuil de rétention de la corbeille. */
export async function notifyTrashOverdue() {
  const policy = await prisma.retentionPolicy.findUnique({ where: { dataType: "TRASH" } });
  if (!policy?.isActive) return;

  const before = cutoff(policy.retentionDays ?? TRASH_RETENTION_DAYS);
  const [projects, tasks, documents] = await Promise.all([
    prisma.project.count({ where: { deletedAt: { lt: before } } }),
    prisma.task.count({ where: { deletedAt: { lt: before } } }),
    prisma.document.count({ where: { deletedAt: { lt: before } } }),
  ]);
  const total = projects + tasks + documents;
  if (total === 0) return;

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { permissions: { some: { permission: { key: PERMISSIONS.TRASH_MANAGE } } } } },
    select: { id: true },
  });

  await Promise.all(
    users.map((u) =>
      createNotification({
        userId: u.id,
        type: "MODIFICATION",
        titre: `${total} élément(s) dans la corbeille dépassent ${policy.retentionDays} jours — purge manuelle recommandée.`,
        lien: "/corbeille",
        entityType: "Trash",
        entityId: new Date().toISOString().slice(0, 10),
      })
    )
  );
}
