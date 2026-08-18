import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BackupImportForm } from "@/components/administration/backup-import-form";
import { RetentionPolicyRow } from "@/components/administration/retention-policy-row";
import { cn } from "@/lib/utils";
import { BACKUP_TABLES } from "@/lib/backup";
import { Download } from "lucide-react";

const RETENTION_LABELS: Record<string, { label: string; description: string }> = {
  AUDIT_LOG: { label: "Journal d'audit", description: "Actions journalisées (connexions, modifications) — purge automatique au-delà du seuil." },
  NOTIFICATION: { label: "Notifications", description: "Notifications déjà lues uniquement — les non lues ne sont jamais purgées." },
  INTEGRATION_EVENT: { label: "Événements d'intégration", description: "Webhooks entrants journalisés (voir Intégrations)." },
  METRIC_SNAPSHOT: { label: "Historique de métriques", description: "Points de tendance (§11 intelligence prédictive) — conservé plus longtemps par défaut." },
  TRASH: { label: "Corbeille (rappel uniquement)", description: "Aucune suppression automatique — envoie un rappel aux gestionnaires de la corbeille au-delà du seuil." },
};
const RETENTION_ORDER = ["AUDIT_LOG", "NOTIFICATION", "INTEGRATION_EVENT", "METRIC_SNAPSHOT", "TRASH"] as const;

const TABLE_LABELS: Record<string, string> = {
  project: "Projets",
  task: "Tâches",
  crmOrganization: "Organisations CRM",
  crmContact: "Contacts CRM",
  crmOpportunity: "Opportunités CRM",
  document: "Documents",
  objective: "Objectifs",
};

// Sauvegarde/restauration (cahier des charges V2.2 §37) — voir src/lib/backup.ts
// pour le perimetre exact (7 tables, colonnes scalaires uniquement).
export default async function DonneesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DATA_BACKUP_MANAGE)) {
    redirect("/dashboard");
  }

  const policies = await prisma.retentionPolicy.findMany();
  const policyByType = new Map(policies.map((p) => [p.dataType, p]));

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div>
        <h1 className="text-2xl font-semibold">Sauvegarde & données</h1>
        <p className="text-sm text-muted-foreground">
          Export/import d&apos;un instantané JSON applicatif — complémentaire des sauvegardes automatiques de la
          base de données gérées par l&apos;hébergeur, pas un remplacement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tables incluses</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {BACKUP_TABLES.map((t) => (
            <span key={t} className="rounded-md border px-2 py-1">
              {TABLE_LABELS[t] ?? t}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export</CardTitle>
        </CardHeader>
        <CardContent>
          <a href="/api/backup/export" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Download className="mr-1.5 h-4 w-4" />
            Télécharger un instantané JSON
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import (restauration)</CardTitle>
        </CardHeader>
        <CardContent>
          <BackupImportForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rétention</CardTitle>
          <p className="text-xs text-muted-foreground">
            Purge automatique quotidienne des journaux/événements au-delà du seuil — jamais des projets, tâches ou
            documents, qui restent une suppression manuelle (voir Corbeille).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {RETENTION_ORDER.map((dataType) => {
            const policy = policyByType.get(dataType);
            const meta = RETENTION_LABELS[dataType];
            return (
              <RetentionPolicyRow
                key={dataType}
                dataType={dataType}
                label={meta.label}
                description={meta.description}
                initialDays={policy?.retentionDays ?? 90}
                initialActive={policy?.isActive ?? true}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
