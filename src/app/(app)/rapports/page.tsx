import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { REPORT_TYPES, REPORT_LABELS, type ReportType } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FORMATS: { format: string; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "excel", label: "Excel" },
  { format: "word", label: "Word" },
];

const DESCRIPTIONS: Record<ReportType, string> = {
  PROJETS: "Liste des projets avec département, responsable, statut, avancement et budget.",
  PROGRAMMES: "Liste des programmes avec responsable, statut, projets associés, avancement et budget.",
  TACHES: "Liste des tâches avec projet, responsable, statut, priorité et échéance.",
  CHARGE_TRAVAIL: "Charge de travail par collaborateur : tâches actives, occupation, disponibilité.",
  OBJECTIFS: "Objectifs et progression de leurs indicateurs.",
  PRODUCTIVITE: "Tâches terminées sur 30 jours et respect des délais, par collaborateur.",
  ACTIVITE: "Journal des actions récentes (30 jours) à travers l'application.",
  PERFORMANCE: "Avancement moyen des projets et progression des objectifs, par département.",
  HEURES_PASSEES: "Total des heures réellement passées par collaborateur.",
};

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.REPORT_EXPORT)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rapports</h1>
        <p className="text-sm text-muted-foreground">
          Exportez les données de la plateforme en PDF, Excel ou Word.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_TYPES.map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-base">{REPORT_LABELS[type]}</CardTitle>
              <CardDescription>{DESCRIPTIONS[type]}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              {FORMATS.map(({ format, label }) => (
                <a
                  key={format}
                  href={`/api/rapports/${type}?format=${format}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  {label}
                </a>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
