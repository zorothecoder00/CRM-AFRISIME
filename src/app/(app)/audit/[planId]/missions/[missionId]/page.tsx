import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/ui/back-link";
import { toneForAuditMissionStatus } from "@/lib/status-tone";
import { AuditMissionStatusForm } from "@/components/audit/audit-mission-status-form";
import { AuditFindingsSection } from "@/components/audit/audit-findings-section";

const STATUT_LABELS: Record<string, string> = {
  PREPARATION: "Préparation",
  COLLECTE: "Collecte",
  VERIFICATION: "Vérification",
  RAPPORT: "Rapport",
  CLOTUREE: "Clôturée",
};

export default async function AuditMissionDetailPage({
  params,
}: {
  params: Promise<{ planId: string; missionId: string }>;
}) {
  const { planId, missionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.AUDIT_MANAGE);

  const [mission, users] = await Promise.all([
    prisma.auditMission.findUnique({
      where: { id: missionId },
      include: {
        plan: { select: { id: true, titre: true } },
        constats: { include: { responsable: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!mission || mission.planId !== planId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/audit/${planId}`} label={`Retour à ${mission.plan.titre}`} />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{mission.titre}</h1>
        <Badge variant={toneForAuditMissionStatus(mission.statut)}>{STATUT_LABELS[mission.statut]}</Badge>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statut et rapport</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditMissionStatusForm
              missionId={mission.id}
              titre={mission.titre}
              statut={mission.statut}
              rapport={mission.rapport}
            />
          </CardContent>
        </Card>
      ) : (
        mission.rapport && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rapport</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{mission.rapport}</CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constats ({mission.constats.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditFindingsSection
            missionId={mission.id}
            findings={mission.constats.map((c) => ({
              id: c.id,
              constat: c.constat,
              recommandation: c.recommandation,
              statut: c.statut,
              responsableId: c.responsableId,
              responsableName: c.responsable?.name ?? null,
              echeance: c.echeance ? c.echeance.toISOString() : null,
            }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
