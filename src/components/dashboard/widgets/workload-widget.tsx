import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { UserWorkload } from "@/lib/workload";

export function WorkloadWidget({ data }: { data: UserWorkload[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Charge de travail</CardTitle>
        <Link href="/charge-de-travail" className="text-xs text-primary hover:underline">
          Voir tout
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée.</p>}
        {data.map((w) => (
          <div key={w.userId}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{w.name}</span>
              <div className="flex items-center gap-2">
                {w.enSurcharge && <Badge variant="destructive">Surcharge</Badge>}
                <span className="text-muted-foreground">{w.tauxOccupation}%</span>
              </div>
            </div>
            <ProgressBar value={w.tauxOccupation} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
