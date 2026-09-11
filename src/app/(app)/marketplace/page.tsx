import type { ReactNode } from "react";
import Link from "next/link";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppStatusSelect } from "@/components/marketplace/app-status-select";
import { AppCatalogFormDialog } from "@/components/marketplace/app-catalog-form-dialog";
import { AppInterestButton } from "@/components/marketplace/app-interest-button";
import { DeleteAppCatalogEntryButton } from "@/components/marketplace/delete-app-catalog-entry-button";
import { Store, Search } from "lucide-react";

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
// architecture", pas construire les apps : catalogue réel (admin-gérable)
// mais aucune app n'est réellement installable ici.
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; statut?: string }>;
}) {
  const { q, categorie, statut } = await searchParams;
  const session = await getAppSession();
  const userId = session!.user.id;
  const canManage = session!.user.permissions.includes(PERMISSIONS.MARKETPLACE_MANAGE);

  const andClauses: Prisma.AppCatalogEntryWhereInput[] = [];
  if (q) andClauses.push({ OR: [{ nom: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
  if (categorie) andClauses.push({ categorie: categorie as never });
  if (statut) andClauses.push({ statut: statut as never });

  const apps = await prisma.appCatalogEntry.findMany({
    where: andClauses.length > 0 ? { AND: andClauses } : undefined,
    include: {
      _count: { select: { interests: true } },
      interests: { where: { userId }, select: { id: true } },
    },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="size-6" />
          <div>
            <h1 className="text-2xl font-semibold">Marketplace — AfriSime Work-Space Apps</h1>
            <p className="text-sm text-muted-foreground">
              Applications prévues pour étendre AfriSime Work-Space à d&apos;autres métiers. Aucune n&apos;est encore
              installable — ce catalogue prépare l&apos;architecture.
            </p>
          </div>
        </div>
        {canManage && <AppCatalogFormDialog />}
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3" action="/marketplace">
        <label className="relative flex-1 space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Rechercher</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Nom ou description..."
              className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </label>
        <FilterSelect name="categorie" label="Catégorie" defaultValue={categorie}>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="statut" label="Statut" defaultValue={statut}>
          {Object.entries(STATUT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Filtrer
        </button>
        {(q || categorie || statut) && (
          <Link href="/marketplace" className="h-9 rounded-md border px-4 text-sm leading-9">
            Réinitialiser
          </Link>
        )}
      </form>

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
            <CardContent className="space-y-3">
              <Badge variant="outline">{CATEGORY_LABELS[app.categorie]}</Badge>
              {app.casUsage && <p className="text-sm text-muted-foreground">{app.casUsage}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {app.statut !== "DISPONIBLE" ? (
                  <AppInterestButton
                    appCatalogEntryId={app.id}
                    initialInterested={app.interests.length > 0}
                    initialCount={app._count.interests}
                  />
                ) : (
                  <span />
                )}
                {canManage && (
                  <div className="flex items-center gap-1">
                    <AppStatusSelect id={app.id} statut={app.statut} />
                    <AppCatalogFormDialog
                      entry={{
                        id: app.id,
                        nom: app.nom,
                        categorie: app.categorie,
                        description: app.description,
                        casUsage: app.casUsage,
                      }}
                    />
                    <DeleteAppCatalogEntryButton id={app.id} nom={app.nom} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {apps.length === 0 && <p className="text-sm text-muted-foreground">Aucune application ne correspond à ces filtres.</p>}
      </div>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="h-9 w-full min-w-40 rounded-md border bg-background px-3 text-sm">
        <option value="">Tous</option>
        {children}
      </select>
    </label>
  );
}
