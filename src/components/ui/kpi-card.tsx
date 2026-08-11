import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiDelta = {
  /** Variation signee (ex: 12.4 ou -3.1), affichee en pourcentage. */
  value: number;
  /** Ex: "vs mois dernier". */
  label?: string;
  /** Une hausse est-elle une bonne nouvelle ? (defaut: oui) */
  isPositiveGood?: boolean;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
}

function Sparkline({ points }: { points: number[] }) {
  const width = 64;
  const height = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = (points.length - 1) * step;
  const lastY = height - ((points[points.length - 1] - min) / range) * height;

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden="true">
      <path
        d={path}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-muted-foreground/40"
      />
      <circle cx={lastX} cy={lastY} r={3} strokeWidth={2} className="fill-[#2a78d6] stroke-card dark:fill-[#3987e5]" />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  trend,
  className,
}: {
  label: string;
  value: number | string;
  delta?: KpiDelta;
  /** Serie de points (min. 2) pour une mini-tendance inline. */
  trend?: number[];
  className?: string;
}) {
  const displayValue = typeof value === "number" ? formatCompact(value) : value;

  let DeltaIcon: typeof ArrowUp | null = null;
  let deltaColorClass = "";
  if (delta) {
    const isUp = delta.value >= 0;
    const isGood = delta.isPositiveGood ?? true;
    const good = isUp === isGood;
    DeltaIcon = isUp ? ArrowUp : ArrowDown;
    deltaColorClass = good ? "text-[#006300] dark:text-[#0ca30c]" : "text-destructive";
  }

  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex items-end justify-between gap-2">
          <div className="text-3xl font-semibold">{displayValue}</div>
          {trend && trend.length > 1 && <Sparkline points={trend} />}
        </div>
        {delta && DeltaIcon && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", deltaColorClass)}>
            <DeltaIcon className="h-3 w-3" />
            <span>
              {delta.value > 0 ? "+" : ""}
              {delta.value}%
            </span>
            {delta.label && <span className="font-normal text-muted-foreground">{delta.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
