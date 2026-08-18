import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BackupImportForm } from "@/components/administration/backup-import-form";
import { cn } from "@/lib/utils";
import { BACKUP_TABLES } from "@/lib/backup";
import { Download } from "lucide-react";

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
    </div>
  );
}
