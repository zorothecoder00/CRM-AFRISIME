import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toneForAdminRequestStatus, accentForAdminRequestStatus } from "@/lib/status-tone";
import { AdminRequestFormDialog } from "@/components/admin-requests/admin-request-form-dialog";

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

export default async function DemandesPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const canCreate = session!.user.permissions.includes(PERMISSIONS.ADMIN_REQUEST_CREATE);
  const canValidate = session!.user.permissions.includes(PERMISSIONS.ADMIN_REQUEST_VALIDATE);

  const [myRequests, departments, pendingApprovals] = await Promise.all([
    prisma.adminRequest.findMany({
      where: { demandeurId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    canValidate
      ? prisma.adminRequestApproval.findMany({
          where: {
            statut: "EN_ATTENTE",
            step: { approverRole: session!.user.roleKey as never },
            run: { statut: "EN_COURS" },
          },
          include: { run: { include: { adminRequest: true } }, step: true },
        })
      : Promise.resolve([]),
  ]);

  const myPendingApprovals = pendingApprovals.filter((a) => a.step.ordre === a.run.currentOrdre);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Demandes administratives</h1>
          <p className="text-sm text-muted-foreground">
            Achats, missions, décaissements, matériel, autorisations, recrutements — soumis au
            circuit de validation configuré par l&apos;administration.
          </p>
        </div>
        {canCreate && (
          <AdminRequestFormDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
        )}
      </div>

      {canValidate && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
            En attente de ma validation
          </h2>
          {myPendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien à valider.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myPendingApprovals.map((a) => (
                <Link key={a.id} href={`/demandes/${a.run.adminRequest.id}`}>
                  <Card
                    accent="warning"
                    className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{a.run.adminRequest.titre}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">{TYPE_LABELS[a.run.adminRequest.type]}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
          Mes demandes
        </h2>
        {myRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myRequests.map((request) => (
              <Link key={request.id} href={`/demandes/${request.id}`}>
                <Card
                  accent={accentForAdminRequestStatus(request.statut)}
                  className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{request.titre}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {request.description || "Pas de description."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{TYPE_LABELS[request.type]}</Badge>
                      <Badge variant={toneForAdminRequestStatus(request.statut)}>
                        {STATUS_LABELS[request.statut]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
