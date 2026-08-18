import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppStatusSelect } from "@/components/marketplace/app-status-select";
import { Store } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  RH: "RH",
  JURIDIQUE: "Juridique",
  ONG: "ONG",
  BTP: "BTP",
  CABINET_CONSEIL: "Cabinet conseil",
  INCUBATEUR: "Incubateur",
  FORMATION: "Formation",
  GESTION_ASSOCIATIVE: "Gestion associative",
  GESTION_PROGRAMMES: "Gestion de programmes",
  GESTION_PROJETS_FINANCES: "Gestion de projets financés",
};

const STATUT_TONE: Record<string, "outline" | "warning" | "success"> = {
  PLANIFIE: "outline",
  BIENTOT: "warning",
  DISPONIBLE: "success",
};

const STATUT_LABELS: Record<string, string> = {
  PLANIFIE: "Planifiée",
  BIENTOT: "Bientôt disponible",
  DISPONIBLE: "Disponible",
};

// Marketplace / App Store (cahier des charges V2.2 §33) — "préparer une
// architecture", pas construire les apps : catalogue réel (admin-gérable
// via le statut) mais aucune app n'est réellement installable ici.
export default async function MarketplacePage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.MARKETPLACE_MANAGE);

  const apps = await prisma.appCatalogEntry.findMany({ orderBy: { nom: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Store className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Marketplace — Work-Flow Apps</h1>
          <p className="text-sm text-muted-foreground">
            Applications prévues pour étendre AfriSime Work-Flow à d&apos;autres métiers. Aucune n&apos;est encore
            installable — ce catalogue prépare l&apos;architecture.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{app.nom}</CardTitle>
                <Badge variant={STATUT_TONE[app.statut]}>{STATUT_LABELS[app.statut]}</Badge>
              </div>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[app.categorie]}</Badge>
              {canManage && <AppStatusSelect id={app.id} statut={app.statut} />}
            </CardContent>
          </Card>
        ))}
        {apps.length === 0 && <p className="text-sm text-muted-foreground">Aucune application au catalogue.</p>}
      </div>
    </div>
  );
}
