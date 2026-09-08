"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/objectives/progress-bar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import type { DashboardData } from "@/lib/dashboard-data";

const MAX_VISIBLE = 5;

function Row({ d }: { d: DashboardData["departmentPerformance"][number] }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{d.departmentName}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{d.activeProjects} projet(s)</span>
          {d.overdueCount > 0 && <Badge variant="destructive">{d.overdueCount} en retard</Badge>}
        </div>
      </div>
      <ProgressBar value={d.avgAvancement} />
    </div>
  );
}

/** Demande utilisateur — pas de lien vers une autre page (aucune page dediee
 * n'existe pour cette agregation) : le reste des departements se deplie sur
 * place. */
export function DepartmentPerformanceWidget({
  data,
}: {
  data: DashboardData["departmentPerformance"];
}) {
  const [open, setOpen] = useState(false);
  const visible = data.slice(0, MAX_VISIBLE);
  const rest = data.slice(MAX_VISIBLE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance par département</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((d) => (
          <Row key={d.departmentId} d={d} />
        ))}
        {rest.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent className="space-y-3 pt-1">
              {rest.map((d) => (
                <Row key={d.departmentId} d={d} />
              ))}
            </CollapsibleContent>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen((v) => !v)}>
              {open ? "Voir moins" : `Voir ${rest.length} de plus`}
            </Button>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
