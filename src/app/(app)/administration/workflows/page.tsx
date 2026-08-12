import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminTabs } from "@/components/administration/admin-tabs";
import { WorkflowFormDialog } from "@/components/administration/workflow-form-dialog";
import { ToggleWorkflowButton } from "@/components/administration/toggle-workflow-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.WORKFLOW_MANAGE)) {
    redirect("/dashboard");
  }

  const [taskWorkflows, adminRequestWorkflows, roles] = await Promise.all([
    prisma.validationWorkflow.findMany({
      where: { entityType: "TASK" },
      include: { steps: { orderBy: { ordre: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.validationWorkflow.findMany({
      where: { entityType: "ADMIN_REQUEST" },
      include: { steps: { orderBy: { ordre: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ select: { key: true, label: true }, orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Circuits de validation</h1>
          <p className="text-sm text-muted-foreground">
            Chaîne d&apos;approbateurs configurable pour les tâches (cahier des charges §9) et
            les demandes administratives (§VII/§VIII). Un seul circuit actif à la fois, par type.
          </p>
        </div>
        <WorkflowFormDialog roles={roles} />
      </div>

      <WorkflowSection title="Tâches" workflows={taskWorkflows} />
      <WorkflowSection title="Demandes administratives" workflows={adminRequestWorkflows} />
    </div>
  );
}

type WorkflowRow = {
  id: string;
  nom: string;
  isActive: boolean;
  steps: { id: string; ordre: number; approverRole: string; label: string | null }[];
};

function WorkflowSection({ title, workflows }: { title: string; workflows: WorkflowRow[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun circuit configuré.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{workflow.nom}</CardTitle>
                <div className="flex items-center gap-2">
                  {workflow.isActive && <Badge>Actif</Badge>}
                  <ToggleWorkflowButton workflowId={workflow.id} isActive={workflow.isActive} />
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1 text-sm">
                  {workflow.steps.map((step) => (
                    <li key={step.id} className="text-muted-foreground">
                      {step.ordre}. {step.label || step.approverRole}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
