import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { IntegrationFormDialog } from "@/components/administration/integration-form-dialog";
import { IntegrationCard } from "@/components/administration/integration-card";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.INTEGRATION_MANAGE)) {
    redirect("/dashboard");
  }

  const integrations = await prisma.integration.findMany({
    include: { events: { orderBy: { receivedAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Intégrations</h1>
          <p className="text-sm text-muted-foreground">
            Connexions à des systèmes externes (AfriGes, Microsoft 365, WhatsApp...) — cadre
            générique avec webhook entrant, sans appel sortant réel dans cette version.
          </p>
        </div>
        <IntegrationFormDialog />
      </div>

      {integrations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune intégration configurée.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      )}
    </div>
  );
}
