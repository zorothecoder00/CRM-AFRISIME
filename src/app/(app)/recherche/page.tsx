import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/search";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search/search-input";

const TYPE_ORDER: SearchResultType[] = ["Projet", "Tâche", "Réunion", "Document", "Utilisateur"];

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getServerSession(authOptions);
  const query = q?.trim() ?? "";

  const results = query.length >= 2 ? await globalSearch(query, session!.user.permissions) : [];

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recherche</h1>
        <p className="text-sm text-muted-foreground">
          Recherche globale à travers les projets, tâches, réunions, documents et utilisateurs.
        </p>
      </div>

      <SearchInput defaultValue={query} />

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
                <Card className="transition-colors hover:bg-muted/50">
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
