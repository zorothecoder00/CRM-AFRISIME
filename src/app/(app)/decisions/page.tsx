import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionMatrixFormDialog } from "@/components/decisions/decision-matrix-form-dialog";
import { Scale } from "lucide-react";

// Matrice de décision (cahier des charges V2.2 §41) — comparer plusieurs
// options selon coût/délai/risque/impact/ressources/ROI/faisabilité et
// produire une recommandation calculée (voir src/lib/decision-matrix.ts).
export default async function DecisionsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.DECISION_MATRIX_MANAGE);

  const matrices = await prisma.decisionMatrix.findMany({
    include: { createdBy: { select: { name: true } }, project: { select: { nom: true } }, _count: { select: { options: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="size-6" />
          <div>
            <h1 className="text-2xl font-semibold">Matrices de décision</h1>
            <p className="text-sm text-muted-foreground">
              Comparez des options et obtenez une recommandation calculée.
            </p>
          </div>
        </div>
        {canManage && <DecisionMatrixFormDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {matrices.map((m) => (
          <Link key={m.id} href={`/decisions/${m.id}`}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{m.titre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {m.project && <p>Projet : {m.project.nom}</p>}
                <p>{m._count.options} option(s)</p>
                <p>Créée par {m.createdBy.name}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {matrices.length === 0 && <p className="text-sm text-muted-foreground">Aucune matrice de décision pour le moment.</p>}
      </div>
    </div>
  );
}
