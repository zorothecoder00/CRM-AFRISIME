import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { DelegationFormDialog } from "@/components/administration/delegation-form-dialog";
import { DeleteDelegationButton } from "@/components/administration/delete-delegation-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statutDelegation(dateDebut: Date, dateFin: Date, now: Date): { label: string; tone: "secondary" | "success" | "outline" } {
  if (now < dateDebut) return { label: "À venir", tone: "outline" };
  if (now > dateFin) return { label: "Terminée", tone: "secondary" };
  return { label: "Active", tone: "success" };
}

export default async function DelegationsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_USERS_MANAGE)) {
    redirect("/dashboard");
  }

  const [delegations, users] = await Promise.all([
    prisma.delegation.findMany({
      include: { delegant: true, delegataire: true },
      orderBy: { dateDebut: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Délégations</h1>
          <p className="text-sm text-muted-foreground">
            Délégation temporaire d&apos;autorité (cahier des charges §I) — registre consultable, ne reroute pas
            automatiquement les circuits de validation.
          </p>
        </div>
        <DelegationFormDialog users={users.map((u) => ({ id: u.id, label: u.name }))} />
      </div>

      {delegations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune délégation enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {delegations.map((d) => {
            const statut = statutDelegation(d.dateDebut, d.dateFin, now);
            return (
              <Card key={d.id} size="sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 px-(--card-spacing)">
                  <div className="text-sm">
                    <span className="font-medium">{d.delegant.name}</span>
                    <span className="mx-1.5 text-muted-foreground">délègue à</span>
                    <span className="font-medium">{d.delegataire.name}</span>
                    {d.motif && <p className="text-xs text-muted-foreground">{d.motif}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {d.dateDebut.toLocaleDateString("fr-FR")} → {d.dateFin.toLocaleDateString("fr-FR")}
                    </span>
                    <Badge variant={statut.tone}>{statut.label}</Badge>
                    <DeleteDelegationButton id={d.id} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
