import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INSTANCE_TYPE_LABELS } from "@/components/gouvernance/instance-form-dialog";
import { InstanceMemberForm } from "@/components/gouvernance/instance-member-form";
import { GovernanceMeetingFormDialog } from "@/components/gouvernance/governance-meeting-form-dialog";

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

export default async function GovernanceInstanceDetailPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.GOVERNANCE_MANAGE);

  const [instance, users] = await Promise.all([
    prisma.governanceInstance.findUnique({
      where: { id: instanceId },
      include: {
        createdBy: true,
        membres: { include: { user: true }, orderBy: { createdAt: "asc" } },
        reunions: { orderBy: { dateHeure: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!instance) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{instance.nom}</h1>
            {!instance.estActive && <Badge variant="outline">Inactive</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {INSTANCE_TYPE_LABELS[instance.type]} · Créée par {instance.createdBy.name}
          </p>
          {instance.description && <p className="mt-2 text-sm">{instance.description}</p>}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Réunions</CardTitle>
            {canManage && (
              <GovernanceMeetingFormDialog
                instanceId={instance.id}
                users={users.map((u) => ({ id: u.id, label: u.name }))}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {instance.reunions.map((r) => (
              <Link
                key={r.id}
                href={`/gouvernance/reunions/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{r.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.dateHeure).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <Badge variant={toneForStatus(r.statut)}>{STATUS_LABELS[r.statut]}</Badge>
              </Link>
            ))}
            {instance.reunions.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune réunion pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membres</CardTitle>
          </CardHeader>
          <CardContent>
            <InstanceMemberForm
              instanceId={instance.id}
              members={instance.membres.map((m) => ({
                id: m.id,
                userId: m.userId,
                userName: m.user.name,
                fonction: m.fonction,
                role: m.role,
                mandat: m.mandat,
                dateDebut: m.dateDebut ? m.dateDebut.toISOString() : null,
                dateFin: m.dateFin ? m.dateFin.toISOString() : null,
                statut: m.statut,
              }))}
              users={users.map((u) => ({ id: u.id, label: u.name }))}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
