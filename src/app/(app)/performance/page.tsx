import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function PerformancePage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <CardTitle>Module Performance à venir</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        Les tableaux de bord personnalisables arriveront dans une prochaine
        version d&apos;AfriFlow. Les objectifs &amp; KPI et la charge de
        travail sont déjà disponibles dans le menu.
      </CardContent>
    </Card>
  );
}
