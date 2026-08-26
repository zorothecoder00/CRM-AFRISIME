import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StakeholderMatrixEntry = {
  id: string;
  nom: string;
  influence: string;
  interet: string;
};

const QUADRANTS = [
  { key: "informer", influenceForte: false, interetFort: true, label: "Informer", hint: "Faible influence · Fort intérêt" },
  { key: "gerer", influenceForte: true, interetFort: true, label: "Gérer de près", hint: "Forte influence · Fort intérêt" },
  { key: "surveiller", influenceForte: false, interetFort: false, label: "Surveiller", hint: "Faible influence · Faible intérêt" },
  { key: "satisfaire", influenceForte: true, interetFort: false, label: "Satisfaire", hint: "Forte influence · Faible intérêt" },
] as const;

function isForte(niveau: string): boolean {
  return niveau.toUpperCase() !== "FAIBLE";
}

/**
 * Matrice Influence x Intérêt (Project Studio §9, Stakeholder Analysis) — vue
 * en grille 2x2, en plus du texte de quadrant deja affiche par stakeholder.
 */
export function StakeholderMatrix({ stakeholders }: { stakeholders: StakeholderMatrixEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Matrice Influence × Intérêt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex flex-col items-center justify-center gap-1 pr-1">
            <span
              className="text-xs font-medium text-muted-foreground"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Intérêt (faible → fort)
            </span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              {QUADRANTS.filter((q) => q.interetFort)
                .sort((a, b) => Number(a.influenceForte) - Number(b.influenceForte))
                .map((q) => (
                  <MatrixCell
                    key={q.key}
                    quadrant={q}
                    stakeholders={stakeholders.filter(
                      (s) => isForte(s.influence) === q.influenceForte && isForte(s.interet) === q.interetFort
                    )}
                  />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUADRANTS.filter((q) => !q.interetFort)
                .sort((a, b) => Number(a.influenceForte) - Number(b.influenceForte))
                .map((q) => (
                  <MatrixCell
                    key={q.key}
                    quadrant={q}
                    stakeholders={stakeholders.filter(
                      (s) => isForte(s.influence) === q.influenceForte && isForte(s.interet) === q.interetFort
                    )}
                  />
                ))}
            </div>
            <p className="pl-1 text-center text-xs font-medium text-muted-foreground">Influence (faible → fort)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatrixCell({
  quadrant,
  stakeholders,
}: {
  quadrant: (typeof QUADRANTS)[number];
  stakeholders: StakeholderMatrixEntry[];
}) {
  return (
    <div className="min-h-28 rounded-md border bg-muted/30 p-2">
      <p className="text-xs font-semibold">{quadrant.label}</p>
      <p className="text-[10px] text-muted-foreground">{quadrant.hint}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {stakeholders.map((s) => (
          <Link
            key={s.id}
            href={`/parties-prenantes/${s.id}`}
            className="rounded-full border bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
          >
            {s.nom}
          </Link>
        ))}
        {stakeholders.length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
