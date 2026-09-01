import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";

export default async function ParametresNotificationsPage() {
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { phone: true, notificationChannelsPreferred: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez comment vous souhaitez être notifié en dehors de l&apos;application.
        </p>
      </div>

      <NotificationPreferencesForm initialChannels={user.notificationChannelsPreferred} hasPhone={!!user.phone} />
    </div>
  );
}
