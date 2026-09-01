import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export type PerformanceTrendWeek = {
  label: string;
  count: number;
};

/** Tendance des tâches terminées sur les 6 dernières semaines (S-5 → S). */
export function PersonalPerformanceTrend({ weeks }: { weeks: PerformanceTrendWeek[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <TrendingUp className="size-5 text-primary" />
        <CardTitle className="text-base">Tâches terminées par semaine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 px-1">
          {weeks.map((w) => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span className="text-xs font-semibold">{w.count}</span>
              <div className="relative h-24 w-full">
                <div
                  className="absolute bottom-0 w-full rounded-t-md bg-primary/70"
                  style={{ height: `${Math.max(4, (w.count / max) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{w.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
