import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MfaSettings } from "@/components/security/mfa-settings";
import { SessionList } from "@/components/security/session-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParametresSecuritePage() {
  const session = await getServerSession(authOptions);
  const [user, sessions] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session!.user.id },
      select: { mfaEnabled: true },
    }),
    prisma.userSession.findMany({
      where: { userId: session!.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes paramètres de sécurité</h1>
        <p className="text-sm text-muted-foreground">
          Gérez la double authentification et les sessions actives de votre compte.
        </p>
      </div>

      <MfaSettings initialEnabled={user.mfaEnabled} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions actives</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={sessions.map((s) => ({
              id: s.id,
              userAgent: s.userAgent,
              ipAddress: s.ipAddress,
              createdAt: s.createdAt.toISOString(),
              lastSeenAt: s.lastSeenAt.toISOString(),
            }))}
            currentSessionId={session!.user.sessionId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
