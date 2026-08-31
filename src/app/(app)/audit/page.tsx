import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditPlanFormDialog } from "@/components/audit/audit-plan-form-dialog";

/** v2.0 §8 — Audit interne : registre des plans d'audit (équipe, missions, constats). */
export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.AUDIT_MANAGE);

  const plans = await prisma.auditPlan.findMany({
    include: {
      createdBy: true,
      _count: { select: { missions: true, equipe: true } },
      missions: { select: { statut: true } },
    },
    orderBy: { dateDebut: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Audit interne</h1>
          <p className="text-sm text-muted-foreground">{plans.length} plan(s) d&apos;audit</p>
        </div>
        {canManage && <AuditPlanFormDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const cloturees = plan.missions.filter((m) => m.statut === "CLOTUREE").length;
          return (
            <Link key={plan.id} href={`/audit/${plan.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{plan.titre}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(plan.dateDebut).toLocaleDateString("fr-FR")} → {new Date(plan.dateFin).toLocaleDateString("fr-FR")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.perimetre && <p className="line-clamp-2 text-sm text-muted-foreground">{plan.perimetre}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{plan._count.equipe} auditeur(s)</Badge>
                    <Badge variant="outline">
                      {cloturees}/{plan._count.missions} mission(s) clôturée(s)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Créé par {plan.createdBy.name}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {plans.length === 0 && <p className="text-sm text-muted-foreground">Aucun plan d&apos;audit pour le moment.</p>}
      </div>
    </div>
  );
}
