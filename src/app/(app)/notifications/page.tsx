import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDeadlineNotifications } from "@/lib/notify";
import { runDeadlineApproachingRules } from "@/lib/automation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { NOTIFICATION_TONE_META, toneForNotificationType } from "@/lib/notification-tone";

const TYPE_LABELS: Record<string, string> = {
  NOUVELLE_TACHE: "Nouvelle tâche",
  MODIFICATION: "Modification",
  COMMENTAIRE: "Commentaire",
  VALIDATION: "Validation",
  ECHEANCE_PROCHE: "Échéance proche",
  RETARD: "Retard",
  MENTION: "Mention",
  SURCHARGE: "Surcharge",
  CLIENT_SANS_SUIVI: "Client sans suivi",
  BUDGET_DEPASSE: "Budget dépassé",
  RELANCE_PLANIFIEE: "Relance planifiée",
  TACHE_CRITIQUE: "Tâche critique",
  RAPPORT_HEBDOMADAIRE: "Rapport hebdomadaire",
  CONTRAT_EXPIRE: "Contrat expiré",
  REUNION_INVITATION: "Invitation à une réunion",
  DEMANDE_DISPONIBILITE: "Demande de créneau",
  DEMANDE_DISPONIBILITE_DECISION: "Réponse à une demande de créneau",
  RAPPEL_ACTIVITE: "Rappel d'activité",
  ACTIVITE_INVITATION: "Invitation à une activité",
  DELEGATION_EN_RETARD: "Délégation en retard",
  CONGE_REORGANISATION: "Réorganisation suite à un congé",
  DEMANDE_REAFFECTATION_TACHE: "Demande de réaffectation",
  DISPONIBILITE_MODIFIEE: "Disponibilité modifiée",
  STATUT_MODIFIE: "Statut modifié",
};

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  await generateDeadlineNotifications(userId);
  await runDeadlineApproachingRules(userId);

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} non lue(s) sur {notifications.length}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Aucune notification.</p>
          )}
          {notifications.map((n) => {
            const tone = NOTIFICATION_TONE_META[toneForNotificationType(n.type)];
            return (
            <NotificationRow key={n.id} notification={n}>
              <div className="flex items-center justify-between gap-2 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${tone.className}`}>
                      {tone.emoji} {tone.label}
                    </span>
                    <Badge variant="outline">{TYPE_LABELS[n.type] ?? n.type}</Badge>
                    {!n.isRead && <Badge variant="secondary">Non lu</Badge>}
                  </div>
                  {n.lien ? (
                    <Link href={n.lien} className="font-medium hover:underline">
                      {n.titre}
                    </Link>
                  ) : (
                    <span className="font-medium">{n.titre}</span>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
            </NotificationRow>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
