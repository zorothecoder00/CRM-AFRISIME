import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph } from "@/lib/knowledge-graph";
import { KnowledgeGraphView } from "@/components/knowledge-graph/knowledge-graph-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROOT_TYPES = [
  { key: "User", label: "Personnes" },
  { key: "GovernanceInstance", label: "Instances de gouvernance" },
] as const;

type RootType = (typeof ROOT_TYPES)[number]["key"];

// Graphe de connaissances (cahier des charges V2.2 §27) — page dediee,
// distincte du graphe relationnel CRM (§12, embarque directement sur les
// fiches contact/organisation). Racine choisie parmi Personne/Instance via
// une liste cliquable (pas de dropdown a cascade, plus simple sans JS
// cote client) ; voir src/lib/knowledge-graph.ts pour la chaine
// Personne -> Projet -> Processus -> Document -> Decision -> Instance.
export default async function KnowledgeGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ rootType?: string; rootId?: string }>;
}) {
  const sp = await searchParams;
  const rootType: RootType = ROOT_TYPES.some((t) => t.key === sp.rootType) ? (sp.rootType as RootType) : "User";

  const [users, instances] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.governanceInstance.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  const candidates = rootType === "User" ? users.map((u) => ({ id: u.id, label: u.name })) : instances.map((i) => ({ id: i.id, label: i.nom }));
  const rootId = sp.rootId && candidates.some((c) => c.id === sp.rootId) ? sp.rootId : candidates[0]?.id;

  const graph = rootId ? await buildKnowledgeGraph(rootType, rootId) : { nodes: [], edges: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Graphe de connaissances</h1>
        <p className="text-sm text-muted-foreground">
          Personne → travaille sur → Projet → dépend de → Processus → produit → Document → résulte de → Décision →
          prise par → Instance.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROOT_TYPES.map((t) => (
          <Link key={t.key} href={`/graphe-de-connaissances?rootType=${t.key}`}>
            <Badge variant={rootType === t.key ? "default" : "outline"}>{t.label}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Racine</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] space-y-1 overflow-y-auto">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/graphe-de-connaissances?rootType=${rootType}&rootId=${c.id}`}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                  c.id === rootId && "bg-muted font-medium"
                )}
              >
                {c.label}
              </Link>
            ))}
            {candidates.length === 0 && <p className="text-sm text-muted-foreground">Aucune entrée.</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <KnowledgeGraphView nodes={graph.nodes} edges={graph.edges} />
        </div>
      </div>
    </div>
  );
}
