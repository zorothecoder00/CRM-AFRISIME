import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { CompetenceFormDialog } from "@/components/administration/competence-form-dialog";
import { DeleteCompetenceButton } from "@/components/administration/delete-competence-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CompetencesPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE)) {
    redirect("/dashboard");
  }

  const competences = await prisma.competence.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { nom: "asc" },
  });

  const byCategory = new Map<string, typeof competences>();
  for (const c of competences) {
    const key = c.categorie || "Sans catégorie";
    byCategory.set(key, [...(byCategory.get(key) ?? []), c]);
  }

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Compétences</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue de compétences (cahier des charges §XII) — chaque collaborateur déclare les siennes depuis
            son profil.
          </p>
        </div>
        <CompetenceFormDialog />
      </div>

      {competences.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune compétence définie.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(byCategory.entries()).map(([categorie, items]) => (
            <Card key={categorie} size="sm">
              <CardHeader>
                <CardTitle className="text-base">{categorie}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {items.map((c) => (
                  <Badge key={c.id} variant="outline" className="gap-1 py-1">
                    {c.nom}
                    <span className="text-muted-foreground">({c._count.users})</span>
                    <DeleteCompetenceButton id={c.id} />
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
