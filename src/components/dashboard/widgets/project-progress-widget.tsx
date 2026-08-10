import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/objectives/progress-bar";
import type { DashboardData } from "@/lib/dashboard-data";

export function ProjectProgressWidget({ data }: { data: DashboardData["projectProgress"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taux d&apos;avancement des projets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet.</p>}
        {data.map((p) => (
          <Link key={p.id} href={`/projets/${p.id}`} className="block">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium hover:underline">{p.nom}</span>
              <span className="text-muted-foreground">{p.avancement}%</span>
            </div>
            <ProgressBar value={p.avancement} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
