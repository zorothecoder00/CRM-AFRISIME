import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";
import type { TaskPriorityScore } from "@/lib/task-priority";

const RANK_TONE = [
  "bg-amber-400/20 text-amber-600 dark:text-amber-400", // 1 — or
  "bg-slate-400/20 text-slate-600 dark:text-slate-300", // 2 — argent
  "bg-orange-400/20 text-orange-700 dark:text-orange-400", // 3 — bronze
] as const;

// Moteur de priorisation IA (cahier des charges V2.2 §40) — "Top 5 des
// actions à réaliser aujourd'hui", voir src/lib/task-priority.ts.
//
// Demande utilisateur — "rendre ça 3D au survol" : chaque ligne bascule en
// carte avec effet de bascule 3D (perspective + rotation legere + elevation
// d'ombre) au survol, au lieu d'une simple ligne de texte plate.
export function TopPriorityActionsCard({ actions }: { actions: TaskPriorityScore[] }) {
  // Demande utilisateur — fond de la carte nettement colore (pas juste
  // blanc/gris) ; garde le bleu ici (accent d'origine, pas vise par la
  // remarque "trop de bleu", qui portait sur les lignes ci-dessous). bg-none
  // neutralise le degrade par defaut de l'accent (qui finit en var(--card),
  // quasi-blanc) au profit d'une teinte pleine et visible.
  return (
    <Card accent="primary" className="bg-none bg-primary/10">
      <CardHeader className="flex flex-row items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Target className="size-4" />
        </span>
        <CardTitle className="text-base">Top 5 des actions à réaliser aujourd&apos;hui</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche active à prioriser.</p>
        ) : (
          <ol className="space-y-2 [perspective:1000px]">
            {actions.map((a, i) => (
              <li key={a.taskId}>
                <Link
                  href={a.href}
                  // Demande utilisateur — chaque ligne était en bg-card (blanc) ;
                  // "success" (vert, une couleur du logo) plutot que primary
                  // (bleu, deja la couleur de la carte englobante juste
                  // au-dessus) pour que les lignes restent distinctes sans
                  // ajouter encore du bleu.
                  className="group flex items-center gap-3 rounded-lg border bg-success/15 p-2.5 text-sm shadow-sm transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:rotate-x-6 hover:border-success/40 hover:bg-success/20 hover:shadow-xl"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform group-hover:scale-110",
                      RANK_TONE[i] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium group-hover:text-success group-hover:underline">
                      {a.titre}
                    </span>
                    <span className="shrink-0 truncate text-xs text-muted-foreground">{a.projectNom}</span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {a.score}
                  </Badge>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
