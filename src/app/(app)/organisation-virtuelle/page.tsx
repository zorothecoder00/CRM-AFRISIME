import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SIMULE: "Simulé",
  DEPLOYE: "Déployé",
};

const STATUT_TONE: Record<string, "secondary" | "info" | "success"> = {
  BROUILLON: "secondary",
  SIMULE: "info",
  DEPLOYE: "success",
};

// Organizational Designer (cahier des charges V3.0 §21) — concevoir
// virtuellement une organisation (ex. Direction -> pays -> équipes) puis la
// simuler avant tout déploiement réel dans les vraies tables organisationnelles.
export default async function OrganisationVirtuellePage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.DEPARTMENT_MANAGE);

  const drafts = await prisma.orgDesignDraft.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizational Designer</h1>
          <p className="text-sm text-muted-foreground">
            Concevez virtuellement une organisation (directions, équipes, responsables, compétences, projets,
            processus) et simulez-la avant tout déploiement réel.
          </p>
        </div>
        {canManage && (
          <Link href="/organisation-virtuelle/nouveau">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Nouveau brouillon
            </Button>
          </Link>
        )}
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun brouillon organisationnel créé pour le moment.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => (
            <Link key={d.id} href={`/organisation-virtuelle/${d.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{d.nom}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant={STATUT_TONE[d.statut]}>{STATUT_LABELS[d.statut]}</Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                  <p className="text-xs text-muted-foreground">Par {d.createdBy.name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
