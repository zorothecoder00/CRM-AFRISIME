import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { ApiKeyFormDialog } from "@/components/administration/api-key-form-dialog";
import { ApiKeyRevokeButton } from "@/components/administration/api-key-revoke-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ApiKeysPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.API_MANAGE)) {
    redirect("/dashboard");
  }

  const keys = await prisma.apiKey.findMany({
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clés API</h1>
          <p className="text-sm text-muted-foreground">
            Authentification Bearer pour l&apos;API REST sortante (/api/v1/...) — cahier des charges §34. OAuth2
            reste un chantier différé, l&apos;accès se fait par clé API scoped par permissions.
          </p>
        </div>
        <ApiKeyFormDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((key) => (
          <Card key={key.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{key.nom}</CardTitle>
                <p className="font-mono text-xs text-muted-foreground">{key.keyPrefix}…</p>
              </div>
              {key.revokedAt ? (
                <Badge variant="destructive">Révoquée</Badge>
              ) : (
                <ApiKeyRevokeButton id={key.id} />
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                {key.permissions.map((p) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Créée par {key.createdBy.name} le {key.createdAt.toLocaleDateString("fr-FR")}
                {key.lastUsedAt && ` · dernière utilisation le ${key.lastUsedAt.toLocaleDateString("fr-FR")}`}
              </p>
            </CardContent>
          </Card>
        ))}
        {keys.length === 0 && <p className="text-sm text-muted-foreground">Aucune clé API pour le moment.</p>}
      </div>
    </div>
  );
}
