import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConsolidationPaysPage({
  params,
}: {
  params: Promise<{ pays: string }>;
}) {
  const { pays: paysParam } = await params;
  const pays = decodeURIComponent(paysParam);

  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.ENTITY_VIEW_ALL)) {
    redirect("/dashboard");
  }

  const entities = await prisma.entity.findMany({
    where: { pays },
    include: { _count: { select: { departments: true, children: true } } },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{pays}</h1>
        <p className="text-sm text-muted-foreground">
          {entities.length} société(s)/entité(s) rattachée(s) à ce pays.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {entities.map((e) => (
          <Link key={e.id} href={`/consolidation/entite/${e.id}`}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{e.nom}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {e._count.departments} département(s) rattaché(s) · {e._count.children} sous-entité(s)
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {entities.length === 0 && <p className="text-sm text-muted-foreground">Aucune entité pour ce pays.</p>}
      </div>
    </div>
  );
}
