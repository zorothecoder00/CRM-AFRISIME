import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toneForPriority } from "@/lib/status-tone";
import { AxisFormDialog } from "@/components/strategy/axis-form-dialog";
import { DeleteAxisButton } from "@/components/strategy/delete-axis-button";

const PRIORITY_LABELS: Record<string, string> = { BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", CRITIQUE: "Critique" };

export default async function StrategiePage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLAN_READ)) {
    redirect("/dashboard");
  }
  const canManage = session!.user.permissions.includes(PERMISSIONS.PLAN_MANAGE);
  const canEditProfile = session!.user.permissions.includes(PERMISSIONS.ADMINISTRATION_ACCESS);

  const [profile, axes] = await Promise.all([
    prisma.organizationProfile.findUnique({ where: { id: "org-profile" } }),
    prisma.strategicAxis.findMany({
      include: { _count: { select: { plans: true, objectives: true } } },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stratégie</h1>
          <p className="text-sm text-muted-foreground">
            Vision, mission, valeurs et axes stratégiques (cahier des charges §III) — le socle que la
            planification et les objectifs déclinent ensuite.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/objectifs">
            <Button variant="outline" size="sm">
              Objectifs &amp; KPI
            </Button>
          </Link>
          <Link href="/planification">
            <Button variant="outline" size="sm">
              Planification
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{profile?.nom ?? "Mon organisation"}</CardTitle>
            <CardDescription>Vision, mission et valeurs</CardDescription>
          </div>
          {canEditProfile && (
            <Link href="/administration/profil">
              <Button variant="outline" size="sm">
                Modifier
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Vision</div>
            <p className="whitespace-pre-wrap">{profile?.vision || "Non renseignée."}</p>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Mission</div>
            <p className="whitespace-pre-wrap">{profile?.mission || "Non renseignée."}</p>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Valeurs</div>
            <p className="whitespace-pre-wrap">{profile?.valeurs || "Non renseignées."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Axes stratégiques ({axes.length})</CardTitle>
            <CardDescription>
              Rattachables aux plans et aux objectifs pour tracer la contribution du travail quotidien à la
              stratégie.
            </CardDescription>
          </div>
          {canManage && <AxisFormDialog />}
        </CardHeader>
        <CardContent>
          {axes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun axe stratégique défini.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {axes.map((axis) => (
                <Card key={axis.id} size="sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">{axis.nom}</CardTitle>
                    {canManage && (
                      <div className="flex items-center">
                        <AxisFormDialog axis={{ id: axis.id, nom: axis.nom, description: axis.description, priorite: axis.priorite }} />
                        <DeleteAxisButton id={axis.id} />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {axis.description && <p className="text-muted-foreground">{axis.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={toneForPriority(axis.priorite)}>{PRIORITY_LABELS[axis.priorite]}</Badge>
                      <Badge variant="secondary">{axis._count.plans} plan(s)</Badge>
                      <Badge variant="secondary">{axis._count.objectives} objectif(s)</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
