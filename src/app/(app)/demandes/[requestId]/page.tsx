import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForAdminRequestStatus, accentForAdminRequestStatus } from "@/lib/status-tone";
import { AdminRequestDecisionActions } from "@/components/admin-requests/admin-request-decision-actions";
import { getOrganizationDevise } from "@/lib/currency";

const TYPE_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  MISSION: "Mission",
  DECAISSEMENT: "Décaissement",
  MATERIEL: "Matériel",
  AUTORISATION: "Autorisation",
  RECRUTEMENT: "Recrutement",
  AUTRE: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  APPROUVEE: "Approuvée",
  REJETEE: "Rejetée",
};

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const session = await getServerSession(authOptions);
  const devise = await getOrganizationDevise();

  const request = await prisma.adminRequest.findUnique({
    where: { id: requestId },
    include: {
      demandeur: true,
      department: true,
      task: true,
      validationRun: {
        include: {
          workflow: { include: { steps: { orderBy: { ordre: "asc" } } } },
          approvals: { include: { approver: true, step: true } },
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const isCurrentApprover =
    request.validationRun?.statut === "EN_COURS" &&
    request.validationRun.workflow.steps.find((s) => s.ordre === request.validationRun!.currentOrdre)
      ?.approverRole === session!.user.roleKey;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{request.titre}</h1>
            <Badge variant={toneForAdminRequestStatus(request.statut)}>{STATUS_LABELS[request.statut]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {TYPE_LABELS[request.type]} · Demandé par {request.demandeur.name}
          </p>
        </div>

        <Card accent={accentForAdminRequestStatus(request.statut)}>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Montant estimé" value={request.montant ? `${Number(request.montant).toLocaleString("fr-FR")} ${devise}` : "—"} />
            <Info label="Département" value={request.department?.name ?? "—"} />
            <Info label="Date de début" value={request.dateDebut ? request.dateDebut.toLocaleDateString("fr-FR") : "—"} />
            <Info label="Date de fin" value={request.dateFin ? request.dateFin.toLocaleDateString("fr-FR") : "—"} />
          </CardContent>
          {request.description && (
            <CardContent className="pt-0 text-sm text-muted-foreground">{request.description}</CardContent>
          )}
          {request.task && (
            <CardContent className="pt-0 text-sm">
              <Link href={`/taches/${request.task.id}`} className="text-primary hover:underline">
                Mission créée : {request.task.titre}
              </Link>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Circuit de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminRequestDecisionActions
              requestId={request.id}
              statut={request.statut}
              isCurrentApprover={!!isCurrentApprover}
              steps={
                request.validationRun?.workflow.steps.map((step) => {
                  const approval = request.validationRun!.approvals.find((a) => a.stepId === step.id);
                  return {
                    ordre: step.ordre,
                    label: step.label ?? step.approverRole,
                    statut: approval?.statut ?? "EN_ATTENTE",
                    approverName: approval?.approver?.name ?? null,
                    isCurrent: step.ordre === request.validationRun!.currentOrdre,
                  };
                }) ?? []
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
