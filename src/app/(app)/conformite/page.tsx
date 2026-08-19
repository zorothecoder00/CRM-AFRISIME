import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceObligationFormDialog } from "@/components/compliance/compliance-obligation-form-dialog";
import { ComplianceControlButtons } from "@/components/compliance/compliance-control-button";

const STATUT_LABELS: Record<string, string> = {
  A_VENIR: "À venir",
  A_JOUR: "À jour",
  EN_RETARD: "En retard",
  NON_CONFORME: "Non conforme",
};
const STATUT_TONE: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
  A_VENIR: "secondary",
  A_JOUR: "success",
  EN_RETARD: "warning",
  NON_CONFORME: "destructive",
};

// Conformité (cahier des charges V2.0 §6, réactivée pour V3.0 §44 "Security
// & Trust Center") — le modèle ComplianceObligation existait déjà sans
// aucune page ; cette page comble ce trou plutôt que de dupliquer un
// nouveau modèle.
export default async function ConformitePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.GOVERNANCE_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.GOVERNANCE_MANAGE);

  const [obligations, users] = await Promise.all([
    prisma.complianceObligation.findMany({
      orderBy: { echeance: "asc" },
      include: {
        responsable: { select: { name: true } },
        controles: { orderBy: { dateControle: "desc" }, take: 1 },
        _count: { select: { nonConformites: true } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conformité</h1>
          <p className="text-sm text-muted-foreground">
            Obligations réglementaires et contractuelles, contrôles et non-conformités.
          </p>
        </div>
        {canManage && <ComplianceObligationFormDialog users={users.map((u) => ({ id: u.id, label: u.name }))} />}
      </div>

      {obligations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune obligation de conformité enregistrée.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {obligations.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{o.titre}</CardTitle>
                <Badge variant={STATUT_TONE[o.statut]}>{STATUT_LABELS[o.statut]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.description && <p className="text-muted-foreground">{o.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{o.type}</Badge>
                  {o.echeance && <span>Échéance : {o.echeance.toLocaleDateString("fr-FR")}</span>}
                  {o.responsable && <span>Responsable : {o.responsable.name}</span>}
                  {o._count.nonConformites > 0 && (
                    <Badge variant="destructive">{o._count.nonConformites} non-conformité(s)</Badge>
                  )}
                </div>
                {o.controles[0] && (
                  <p className="text-xs text-muted-foreground">
                    Dernier contrôle : {o.controles[0].resultat} le {o.controles[0].dateControle.toLocaleDateString("fr-FR")}
                  </p>
                )}
                {canManage && <ComplianceControlButtons obligationId={o.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
