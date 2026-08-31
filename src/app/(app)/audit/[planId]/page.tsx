import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { AuditPlanFormDialog } from "@/components/audit/audit-plan-form-dialog";
import { AuditTeamSection } from "@/components/audit/audit-team-section";
import { AuditDocumentFormDialog } from "@/components/audit/audit-document-form-dialog";
import { AuditDocumentsSection } from "@/components/audit/audit-documents-section";
import { AuditMissionsPanel } from "@/components/audit/audit-missions-panel";

export default async function AuditPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.AUDIT_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.AUDIT_MANAGE);

  const [plan, users] = await Promise.all([
    prisma.auditPlan.findUnique({
      where: { id: planId },
      include: {
        createdBy: true,
        equipe: { include: { user: true } },
        documents: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
        missions: { include: { _count: { select: { constats: true } } }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!plan) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/audit" label="Retour aux plans d'audit" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{plan.titre}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(plan.dateDebut).toLocaleDateString("fr-FR")} → {new Date(plan.dateFin).toLocaleDateString("fr-FR")}
          </p>
          <p className="text-xs text-muted-foreground">Créé par {plan.createdBy.name}</p>
        </div>
        {canManage && (
          <AuditPlanFormDialog
            plan={{
              id: plan.id,
              titre: plan.titre,
              dateDebut: plan.dateDebut.toISOString(),
              dateFin: plan.dateFin.toISOString(),
              perimetre: plan.perimetre,
              objectifs: plan.objectifs,
              criteres: plan.criteres,
            }}
          />
        )}
      </div>

      {(plan.perimetre || plan.objectifs || plan.criteres) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadrage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {plan.perimetre && (
              <div>
                <p className="font-medium">Périmètre</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{plan.perimetre}</p>
              </div>
            )}
            {plan.objectifs && (
              <div>
                <p className="font-medium">Objectifs</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{plan.objectifs}</p>
              </div>
            )}
            {plan.criteres && (
              <div>
                <p className="font-medium">Critères d&apos;audit</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{plan.criteres}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Équipe d&apos;audit</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTeamSection
            planId={plan.id}
            members={plan.equipe.map((m) => ({ id: m.id, userId: m.userId, userName: m.user.name }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          {canManage && <AuditDocumentFormDialog planId={plan.id} />}
        </CardHeader>
        <CardContent>
          <AuditDocumentsSection
            documents={plan.documents.map((d) => ({ id: d.id, nom: d.nom, url: d.url, uploadedByName: d.uploadedBy.name }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Missions</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditMissionsPanel
            planId={plan.id}
            missions={plan.missions.map((m) => ({ id: m.id, titre: m.titre, statut: m.statut, constatsCount: m._count.constats }))}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
