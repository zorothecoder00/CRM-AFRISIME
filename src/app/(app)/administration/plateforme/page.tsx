import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { PlatformOrganizationFormDialog } from "@/components/administration/platform-organization-form-dialog";
import { PlatformOrganizationCard } from "@/components/administration/platform-organization-card";

// Multi-Organization Platform (cahier des charges V3.0 §27) — registre des
// organisations de la plateforme (branding + abonnement), fondation en vue
// d'un futur multi-tenant réel. Ne remplace PAS /administration/profil, qui
// reste le profil de l'organisation unique pilotée par cette instance —
// voir le commentaire sur le modèle PlatformOrganization dans schema.prisma
// pour le détail de ce choix de périmètre.
export default async function PlateformePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLATFORM_MANAGE)) {
    redirect("/dashboard");
  }

  const [organizations, apiKeysCount, appsDisponiblesCount, aiAgentsActifs, integrationsConnectees, portailsActifs] =
    await Promise.all([
      prisma.platformOrganization.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.apiKey.count({ where: { revokedAt: null } }),
      prisma.appCatalogEntry.count({ where: { statut: "DISPONIBLE" } }),
      prisma.aiAgentInsight.groupBy({ by: ["agent"] }).then((rows) => rows.length),
      prisma.integration.count({ where: { statut: "CONNECTE" } }),
      prisma.portalAccount.count({ where: { isActive: true } }),
    ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plateforme multi-organisation</h1>
          <p className="text-sm text-muted-foreground">
            Registre des organisations indépendantes préparées pour la plateforme — branding et abonnement. L&apos;isolation
            complète des données par organisation reste une évolution future, hors périmètre de ce registre.
          </p>
        </div>
        <PlatformOrganizationFormDialog />
      </div>

      {/* Open Ecosystem (cahier des charges V3.0 §49) — Work-Flow Core + API +
          Apps + AI Agents + Integrations + External Portals = Work-Flow
          Ecosystem. Statut agrégé plutôt qu'un nouveau schéma : chaque couche
          existe déjà (marketplace §33 v2.2, clés API §34 v2.2, agents IA
          §16, intégrations §21, portails §16-20 v2.2). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Écosystème Work-Flow</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Badge variant="secondary">Core</Badge>
            <p className="text-xs text-muted-foreground">Application principale</p>
          </div>
          <div className="space-y-1">
            <Badge variant="info">{apiKeysCount} clé(s) API</Badge>
            <p className="text-xs text-muted-foreground">Intégration externe</p>
          </div>
          <div className="space-y-1">
            <Badge variant="info">{appsDisponiblesCount} app(s)</Badge>
            <p className="text-xs text-muted-foreground">Marketplace</p>
          </div>
          <div className="space-y-1">
            <Badge variant="info">{aiAgentsActifs} agent(s) IA</Badge>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </div>
          <div className="space-y-1">
            <Badge variant="info">{integrationsConnectees} intégration(s)</Badge>
            <p className="text-xs text-muted-foreground">Connectées</p>
          </div>
          <div className="space-y-1">
            <Badge variant="info">{portailsActifs} portail(s)</Badge>
            <p className="text-xs text-muted-foreground">Externes actifs</p>
          </div>
        </CardContent>
      </Card>

      {organizations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune organisation enregistrée.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <PlatformOrganizationCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}
