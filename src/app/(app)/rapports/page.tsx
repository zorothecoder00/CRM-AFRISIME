import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { REPORT_TYPES, REPORT_LABELS, type ReportType } from "@/lib/reports";
import { departmentLevelLabel, computeDepartmentDepth } from "@/lib/department-tree";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReportTargetLinks } from "@/components/rapports/report-target-links";

const FORMATS: { format: string; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "excel", label: "Excel" },
  { format: "word", label: "Word" },
  { format: "presentation", label: "Présentation" },
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
  DEPARTEMENT: "Projets d'un département et de ses sous-services — choisissez le département.",
  DIRECTION: "Projets d'une direction et de tous ses départements/services — choisissez la direction.",
  MENSUEL: "Tâches terminées et état des projets sur le dernier mois.",
  TRIMESTRIEL: "Tâches terminées et état des projets sur le dernier trimestre.",
  ANNUEL: "Tâches terminées et état des projets sur la dernière année.",
  AUDIT: "Journal d'audit détaillé (90 jours) — actions, utilisateurs, entités concernées.",
  RISQUES: "Registre consolidé des risques projet et organisationnels.",
  GOUVERNANCE: "Décisions de gouvernance, toutes instances confondues.",
  REVUE_HEBDOMADAIRE:
    "Weekly Business Review (§31) : activités, résultats, objectifs, projets, risques, incidents, décisions, CRM, performances et recommandations de la semaine.",
};

export default async function RapportsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.REPORT_EXPORT)) {
    redirect("/dashboard");
  }

  const departments = await prisma.department.findMany({ select: { id: true, name: true, parentId: true } });
  const directions = departments.filter((d) => computeDepartmentDepth(d.id, new Map(departments.map((x) => [x.id, x]))) === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rapports</h1>
        <p className="text-sm text-muted-foreground">
          Exportez les données de la plateforme en PDF, Excel, Word ou présentation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_TYPES.map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-base">{REPORT_LABELS[type]}</CardTitle>
              <CardDescription>{DESCRIPTIONS[type]}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {type === "DEPARTEMENT" && (
                <ReportTargetLinks
                  type={type}
                  options={departments.map((d) => ({
                    id: d.id,
                    label: `${d.name} (${departmentLevelLabel(computeDepartmentDepth(d.id, new Map(departments.map((x) => [x.id, x]))))})`,
                  }))}
                  formats={FORMATS}
                  placeholder="Département"
                />
              )}
              {type === "DIRECTION" && (
                <ReportTargetLinks
                  type={type}
                  options={directions.map((d) => ({ id: d.id, label: d.name }))}
                  formats={FORMATS}
                  placeholder="Direction"
                />
              )}
              {type !== "DEPARTEMENT" &&
                type !== "DIRECTION" &&
                FORMATS.map(({ format, label }) => (
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
