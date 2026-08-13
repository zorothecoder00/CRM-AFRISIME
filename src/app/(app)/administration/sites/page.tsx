import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { SiteFormDialog } from "@/components/administration/site-form-dialog";
import { DeleteSiteButton } from "@/components/administration/delete-site-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE)) {
    redirect("/dashboard");
  }

  const [sites, departments] = await Promise.all([
    prisma.site.findMany({
      include: { department: true, _count: { select: { users: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sites &amp; agences</h1>
          <p className="text-sm text-muted-foreground">
            Localisations physiques de l&apos;organisation (cahier des charges §I).
          </p>
        </div>
        <SiteFormDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun site défini.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sites.map((s) => (
            <Card key={s.id} size="sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{s.nom}</CardTitle>
                <DeleteSiteButton id={s.id} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {[s.adresse, s.ville, s.pays].filter(Boolean).join(", ") || "Adresse non renseignée"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.department && <Badge variant="outline">{s.department.name}</Badge>}
                  <Badge variant="secondary">{s._count.users} collaborateur(s)</Badge>
                  {s.latitude !== null && s.longitude !== null && (
                    <Badge variant="secondary">{s.latitude.toFixed(3)}, {s.longitude.toFixed(3)}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
