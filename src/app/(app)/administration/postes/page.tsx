import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { PosteFormDialog } from "@/components/administration/poste-form-dialog";
import { DeletePosteButton } from "@/components/administration/delete-poste-button";
import { PosteResponsabiliteList } from "@/components/administration/poste-responsabilite-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PostesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE)) {
    redirect("/dashboard");
  }

  const [postes, departments] = await Promise.all([
    prisma.poste.findMany({
      include: {
        department: true,
        _count: { select: { users: true } },
        responsabilitesListe: { orderBy: { ordre: "asc" } },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Postes</h1>
          <p className="text-sm text-muted-foreground">
            Postes structurés (cahier des charges §I) — avec responsabilités, distincts du rôle qui porte les permissions.
          </p>
        </div>
        <PosteFormDialog departments={departments.map((d) => ({ id: d.id, label: d.name }))} />
      </div>

      {postes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun poste défini.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {postes.map((p) => (
            <Card key={p.id} size="sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{p.nom}</CardTitle>
                <DeletePosteButton id={p.id} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.description && <p className="text-muted-foreground">{p.description}</p>}
                {p.responsabilites && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Notes :</span> {p.responsabilites}
                  </p>
                )}
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Responsabilités</div>
                  <PosteResponsabiliteList
                    posteId={p.id}
                    items={p.responsabilitesListe.map((r) => ({ id: r.id, libelle: r.libelle }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.department && <Badge variant="outline">{p.department.name}</Badge>}
                  <Badge variant="secondary">{p._count.users} collaborateur(s)</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
