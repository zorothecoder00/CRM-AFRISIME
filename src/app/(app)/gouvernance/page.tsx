import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstanceFormDialog, INSTANCE_TYPE_LABELS } from "@/components/gouvernance/instance-form-dialog";

export default async function GouvernancePage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.GOVERNANCE_MANAGE);

  const instances = await prisma.governanceInstance.findMany({
    include: { _count: { select: { membres: true, reunions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gouvernance</h1>
          <p className="text-sm text-muted-foreground">{instances.length} instance(s)</p>
        </div>
        {canManage && <InstanceFormDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <Link key={instance.id} href={`/gouvernance/${instance.id}`}>
            <Card
              accent={instance.estActive ? "success" : "none"}
              className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="text-base">{instance.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {instance.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{instance.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{INSTANCE_TYPE_LABELS[instance.type]}</Badge>
                  <Badge variant="secondary">{instance._count.membres} membre(s)</Badge>
                  <Badge variant="secondary">{instance._count.reunions} réunion(s)</Badge>
                  {!instance.estActive && <Badge variant="outline">Inactive</Badge>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {instances.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune instance de gouvernance pour le moment.</p>
        )}
      </div>
    </div>
  );
}
