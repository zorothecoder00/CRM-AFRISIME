import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/search";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search/search-input";
import { SearchFilters } from "@/components/search/search-filters";

const TYPE_ORDER: SearchResultType[] = [
  "Projet",
  "Tâche",
  "Commentaire",
  "Réunion",
  "Document",
  "Contrat",
  "Décision",
  "Processus",
  "Risque",
  "Article",
  "Courrier",
  "Contact CRM",
  "Organisation CRM",
  "Département",
  "Équipe",
  "Utilisateur",
];

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    responsableId?: string;
    statut?: string;
    priorite?: string;
    projectStatut?: string;
    projectPriorite?: string;
    departmentId?: string;
    tags?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const query = params.q?.trim() ?? "";
  const tags = params.tags
    ? params.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  const [results, users, departments] = await Promise.all([
    query.length >= 2
      ? globalSearch(query, session!.user.permissions, {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          responsableId: params.responsableId,
          statut: params.statut,
          priorite: params.priorite,
          projectStatut: params.projectStatut,
          projectPriorite: params.projectPriorite,
          departmentId: params.departmentId,
          tags,
        })
      : Promise.resolve([]),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recherche</h1>
        <p className="text-sm text-muted-foreground">
          Recherche globale : personnes, projets, tâches, documents, contrats, décisions, réunions, partenaires,
          processus, risques et connaissances.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1">
          <SearchInput defaultValue={query} />
        </div>
        <SearchFilters
          users={users.map((u) => ({ id: u.id, label: u.name }))}
          departments={departments.map((d) => ({ id: d.id, label: d.name }))}
        />
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground">Saisissez au moins 2 caractères.</p>
      )}

      {query.length >= 2 && grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
      )}

      {grouped.map(({ type, items }) => (
        <div key={type} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {type}s ({items.length})
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((item: SearchResult) => (
              <Link key={`${item.type}-${item.id}`} href={item.href}>
                <Card className="transition-all hover:-translate-y-0.5 hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </div>
                    <Badge variant="outline">{item.type}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
