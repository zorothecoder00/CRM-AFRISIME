import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MfaSettings } from "@/components/security/mfa-settings";

export default async function ParametresSecuritePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { mfaEnabled: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes paramètres de sécurité</h1>
        <p className="text-sm text-muted-foreground">
          Gérez la double authentification de votre compte.
        </p>
      </div>

      <MfaSettings initialEnabled={user.mfaEnabled} />
    </div>
  );
}
