import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuccessionPlanFormDialog } from "@/components/succession/succession-plan-form-dialog";
import { SuccessionPlanCard } from "@/components/succession/succession-plan-card";

// Talent & Succession Planning (cahier des charges V3.0 §24) — postes
// critiques, profils de remplacement, compétences, plans de succession,
// potentiel interne. Reste une gestion organisationnelle : pas de paie, pas
// de logiciel RH opérationnel — l'évaluation individuelle continue de vivre
// dans le module Évaluations.
export default async function SuccessionPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.SUCCESSION_MANAGE);

  const [plans, postesCritiques, users] = await Promise.all([
    prisma.successionPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        poste: { select: { nom: true, department: { select: { name: true } } } },
        titulaire: { select: { id: true, name: true } },
        profils: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.poste.findMany({ where: { critique: true }, select: { id: true, nom: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const postesSansPlan = postesCritiques.filter((p) => !plans.some((plan) => plan.poste.nom === p.nom));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Talent & Succession Planning</h1>
          <p className="text-sm text-muted-foreground">
            Postes critiques, profils de remplacement, compétences requises, plans de succession et potentiel interne.
          </p>
        </div>
        {canManage && (
          <SuccessionPlanFormDialog
            postes={postesCritiques.map((p) => ({ id: p.id, label: p.nom }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        )}
      </div>

      {postesSansPlan.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base">Postes critiques sans plan de succession</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {postesSansPlan.map((p) => (
              <Badge key={p.id} variant="warning">
                {p.nom}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun plan de succession créé pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <SuccessionPlanCard
              key={plan.id}
              plan={plan}
              candidateUsers={users
                .filter((u) => !plan.profils.some((p) => p.user.id === u.id))
                .map((u) => ({ id: u.id, label: u.name }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
