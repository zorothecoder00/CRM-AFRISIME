import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { getDashboardData } from "@/lib/dashboard-data";
import { sanitizeWidgetOrder, type WidgetKey } from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";
import { WidgetConfigDialog } from "@/components/dashboard/widget-config-dialog";
import { ProjectProgressWidget } from "@/components/dashboard/widgets/project-progress-widget";
import { OverdueTasksWidget } from "@/components/dashboard/widgets/overdue-tasks-widget";
import { WorkloadWidget } from "@/components/dashboard/widgets/workload-widget";
import { TimeSpentWidget } from "@/components/dashboard/widgets/time-spent-widget";
import { DeadlineComplianceWidget } from "@/components/dashboard/widgets/deadline-compliance-widget";
import { TeamProductivityWidget } from "@/components/dashboard/widgets/team-productivity-widget";
import { DepartmentPerformanceWidget } from "@/components/dashboard/widgets/department-performance-widget";
import { HRIndicatorsWidget } from "@/components/dashboard/widgets/hr-indicators-widget";

// Demande utilisateur — Temps passé et Productivité par équipe sont plus
// courtes que Charge de travail : empilées dans la même cellule de grille
// pour équilibrer visuellement la ligne, plutôt que chacune dans sa propre
// cellule (qui laissait un grand vide sous les deux courtes). Ne s'applique
// que si les deux widgets sont adjacents et actifs dans l'ordre (sinon
// repli normal sur des cellules individuelles).
const STACK_PAIR: [WidgetKey, WidgetKey] = ["TIME_SPENT", "TEAM_PRODUCTIVITY"];

function buildSlots(order: WidgetKey[]): WidgetKey[][] {
  const slots: WidgetKey[][] = [];
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const next = order[i + 1];
    const isPair =
      next !== undefined &&
      ((key === STACK_PAIR[0] && next === STACK_PAIR[1]) || (key === STACK_PAIR[1] && next === STACK_PAIR[0]));
    if (isPair) {
      slots.push([key, next]);
      i++;
    } else {
      slots.push([key]);
    }
  }
  return slots;
}

export default async function TableauxDeBordPage() {
  const session = await getAppSession();
  if (!session!.user.permissions.includes(PERMISSIONS.DASHBOARD_READ)) {
    redirect("/dashboard");
  }

  const [data, preference] = await Promise.all([
    getDashboardData(),
    prisma.dashboardWidgetPreference.findUnique({ where: { userId: session!.user.id } }),
  ]);

  const order = sanitizeWidgetOrder(preference?.widgets);

  const widgetComponents: Record<WidgetKey, React.ReactNode> = {
    PROJECT_PROGRESS: <ProjectProgressWidget data={data.projectProgress} />,
    OVERDUE_TASKS: <OverdueTasksWidget tasks={data.overdueTasks} total={data.overdueCount} />,
    WORKLOAD: <WorkloadWidget data={data.workloadTop} />,
    TIME_SPENT: <TimeSpentWidget data={data.timeSpent} total={data.timeSpentTotal} />,
    DEADLINE_COMPLIANCE: <DeadlineComplianceWidget data={data.deadlineCompliance} />,
    TEAM_PRODUCTIVITY: <TeamProductivityWidget data={data.teamProductivity} />,
    DEPARTMENT_PERFORMANCE: <DepartmentPerformanceWidget data={data.departmentPerformance} />,
    HR_INDICATORS: <HRIndicatorsWidget data={data.hrIndicators} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableaux de bord</h1>
          <p className="text-sm text-muted-foreground">
            Widgets personnalisables — avancement, retards, charge, temps passé,
            productivité et indicateurs RH.
          </p>
        </div>
        <WidgetConfigDialog initialOrder={order} />
      </div>

      {/* Demande utilisateur — la barre de recherche vit maintenant dans la
          topbar, juste a cote de "Planifier · Collaborer · Exécuter ·
          Contrôler" (voir components/layout/topbar.tsx), plus dans le corps
          de page. */}

      {/* items-start — sans ca, une carte courte s'etirait a la hauteur de sa
          voisine sur la meme ligne (grille "stretch" par defaut), laissant un
          grand vide visuel (retour utilisateur : "blocs mal agences"). */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {buildSlots(order).map((slot) => (
          <div
            key={slot.join("-")}
            className={cn("space-y-4", slot.includes("HR_INDICATORS") && "md:col-span-2")}
          >
            {slot.map((key) => (
              <div key={key}>{widgetComponents[key]}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
