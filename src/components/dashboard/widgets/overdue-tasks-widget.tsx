import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard-data";

const MAX_VISIBLE = 5;
// Demande utilisateur — a partir de md, seules 4 lignes restent visibles
// (la 5e est masquee en CSS plus bas) pour que la carte fasse la meme
// hauteur que Performance par departement. "Voir tout" doit donc apparaitre
// des que le total depasse ce plus petit seuil, pas seulement au-dela de 5
// (sinon la 5e tache resterait inaccessible sur ecran moyen/grand).

export function OverdueTasksWidget({
  tasks,
  total,
}: {
  tasks: DashboardData["overdueTasks"];
  total: number;
}) {
  const visible = tasks.slice(0, MAX_VISIBLE);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tâches en retard</CardTitle>
        <Badge variant="destructive">{total}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune tâche en retard.</p>
        )}
        {visible.map((t, i) => (
          <Link
            key={t.id}
            href={`/taches/${t.id}`}
            // Demande utilisateur — a partir de md, une 5e ligne desequilibrait
            // la hauteur par rapport a la carte Performance par departement ;
            // sur mobile/petit ecran, ou les cartes ne s'alignent plus cote a
            // cote, les 5 restent visibles.
            className={cn(
              "flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted",
              i === 4 && "md:hidden"
            )}
          >
            <div>
              <div className="font-medium text-destructive">{t.titre}</div>
              <div className="text-xs text-muted-foreground">
                {t.projectNom} · {t.responsableName}
              </div>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(t.echeance).toLocaleDateString("fr-FR")}
            </span>
          </Link>
        ))}
        {total > MAX_VISIBLE - 1 && (
          <Link href="/taches" className="block text-xs text-primary hover:underline">
            Voir tout ({total})
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
