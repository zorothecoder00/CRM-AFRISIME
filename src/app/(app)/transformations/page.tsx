import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransformationFormDialog } from "@/components/transformations/transformation-form-dialog";

const TYPE_LABELS: Record<string, string> = {
  DIGITALE: "Transformation digitale",
  RESTRUCTURATION: "Restructuration",
  EXPANSION_GEOGRAPHIQUE: "Expansion géographique",
  CHANGEMENT_ORGANISATIONNEL: "Changement organisationnel",
  FUSION: "Fusion",
  ACQUISITION: "Acquisition",
  LANCEMENT_ACTIVITE: "Lancement d'activité",
};

const PHASE_LABELS: Record<string, string> = {
  DIAGNOSTIC: "Diagnostic",
  PLAN: "Plan",
  TRANSFORMATION: "Transformation",
  ADOPTION: "Adoption",
  MESURE: "Mesure",
  AMELIORATION: "Amélioration",
};

const STATUT_TONE: Record<string, "info" | "success" | "secondary"> = {
  EN_COURS: "info",
  TERMINEE: "success",
  ANNULEE: "secondary",
};

// Digital Transformation Management (cahier des charges V3.0 §19) — module
// dédié aux transformations majeures, suivies à travers le cycle Diagnostic
// -> Plan -> Transformation -> Adoption -> Mesure -> Amélioration.
export default async function TransformationsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);

  const [transformations, departments, users] = await Promise.all([
    prisma.transformation.findMany({
      orderBy: { createdAt: "desc" },
      include: { department: { select: { name: true } }, responsable: { select: { name: true } } },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transformations</h1>
          <p className="text-sm text-muted-foreground">
            Transformation digitale, restructuration, expansion géographique, fusion, acquisition, lancement
            d&apos;activité — suivies à travers un cycle en 6 phases.
          </p>
        </div>
        {canManage && (
          <TransformationFormDialog
            departments={departments.map((d) => ({ id: d.id, label: d.name }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        )}
      </div>

      {transformations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune transformation créée pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transformations.map((t) => (
            <Link key={t.id} href={`/transformations/${t.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{t.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{TYPE_LABELS[t.type]}</Badge>
                    <Badge variant={STATUT_TONE[t.statut]}>{PHASE_LABELS[t.phase]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t.department?.name ?? "Organisation entière"} — {t.responsable.name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
