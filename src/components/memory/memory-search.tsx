"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/hooks/use-action";
import { queryOrganizationalMemory } from "@/actions/organizational-memory.actions";
import type { MemoryResult, MemoryResultSource } from "@/lib/organizational-memory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const SOURCE_LABELS: Record<MemoryResultSource, string> = {
  OrganizationalMemoryEntry: "Mémoire",
  MeetingDecision: "Décision de réunion",
  GovernanceDecision: "Décision de gouvernance",
  Processus: "Procédure",
  Transformation: "Transformation",
  Project: "Projet",
  KnowledgeArticle: "Connaissance",
  Incident: "Incident",
  AiAgentInsight: "Recommandation IA",
};

// AI Memory Organisationnelle (cahier des charges V3.0 §17) — permet de
// poser une question du type « pourquoi avons-nous arrêté cette procédure
// l'année dernière ? » et d'obtenir les archives correspondantes, sourcées
// et datées. Recherche par mots-clés déterministe (pas d'appel LLM tant
// qu'aucune clé API n'est configurée — voir searchOrganizationalMemory).
export function MemorySearch({ initialResults }: { initialResults: MemoryResult[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialResults);
  const [hasSearched, setHasSearched] = useState(false);
  const { run, isPending } = useAction(queryOrganizationalMemory);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(query.trim());
    if (result.ok) {
      setResults(result.data);
      setHasSearched(true);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Ex. Pourquoi avons-nous arrêté cette procédure ?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={isPending}>
          <Search className="mr-1.5 h-4 w-4" />
          {isPending ? "Recherche..." : "Rechercher"}
        </Button>
      </form>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          {hasSearched ? `${results.length} résultat(s) pour « ${query} »` : "Entrées récentes de l'archive institutionnelle"}
        </p>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun résultat.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => {
              const content = (
                <div className="rounded-md border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{SOURCE_LABELS[r.source]}</Badge>
                      <span className="text-sm font-medium">{r.titre}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.date.toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {r.extrait && <p className="mt-1 text-sm text-muted-foreground">{r.extrait}</p>}
                </div>
              );
              return r.href ? (
                <Link key={`${r.source}-${r.sourceId}`} href={r.href}>
                  {content}
                </Link>
              ) : (
                <div key={`${r.source}-${r.sourceId}`}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
