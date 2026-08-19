import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
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

  const organizations = await prisma.platformOrganization.findMany({ orderBy: { createdAt: "desc" } });

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
