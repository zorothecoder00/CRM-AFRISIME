import { Gauge } from "lucide-react";

/** §43 « Planning Health » — indicateur composite du planning personnel, jamais bloquant. */
export function PlanningHealthBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <Gauge className={`size-4 ${tone}`} />
      <span>
        Planning Health : <span className={`font-semibold ${tone}`}>{score}/100</span>
      </span>
    </div>
  );
}
