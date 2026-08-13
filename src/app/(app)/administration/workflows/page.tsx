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

  const [taskWorkflows, adminRequestWorkflows, roles, projects] = await Promise.all([
    prisma.validationWorkflow.findMany({
      where: { entityType: "TASK" },
      include: { steps: { orderBy: { ordre: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.validationWorkflow.findMany({
      where: { entityType: "ADMIN_REQUEST" },
      include: { steps: { orderBy: { ordre: "asc" } }, autoTaskProject: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({ select: { key: true, label: true }, orderBy: { label: "asc" } }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
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
        <WorkflowFormDialog roles={roles} projects={projects.map((p) => ({ id: p.id, label: p.nom }))} />
      </div>

      <WorkflowSection title="Tâches" workflows={taskWorkflows} />
      <WorkflowSection title="Demandes administratives" workflows={adminRequestWorkflows} />
    </div>
  );
}

const ADMIN_REQUEST_TYPE_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  MISSION: "Mission",
  DECAISSEMENT: "Décaissement",
  MATERIEL: "Matériel",
  AUTORISATION: "Autorisation",
  RECRUTEMENT: "Recrutement",
  AUTRE: "Autre",
};

type WorkflowRow = {
  id: string;
  nom: string;
  isActive: boolean;
  adminRequestType?: string | null;
  montantMin?: unknown;
  creerTacheAlApprobation?: boolean;
  autoTaskProject?: { nom: string } | null;
  steps: {
    id: string;
    ordre: number;
    approverRole: string;
    label: string | null;
    escaladeJours?: number | null;
    escaladeRole?: string | null;
  }[];
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
              <CardContent className="space-y-2">
                {(workflow.adminRequestType || workflow.montantMin != null) && (
                  <div className="flex flex-wrap gap-1.5">
                    {workflow.adminRequestType && (
                      <Badge variant="outline">{ADMIN_REQUEST_TYPE_LABELS[workflow.adminRequestType]}</Badge>
                    )}
                    {workflow.montantMin != null && (
                      <Badge variant="outline">≥ {Number(workflow.montantMin).toLocaleString("fr-FR")} FCFA</Badge>
                    )}
                  </div>
                )}
                <ol className="space-y-1 text-sm">
                  {workflow.steps.map((step) => (
                    <li key={step.id} className="text-muted-foreground">
                      {step.ordre}. {step.label || step.approverRole}
                      {step.escaladeJours && step.escaladeRole && (
                        <span className="ml-1 text-xs">(escalade à {step.escaladeRole} après {step.escaladeJours}j)</span>
                      )}
                    </li>
                  ))}
                </ol>
                {workflow.creerTacheAlApprobation && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Crée une tâche dans « {workflow.autoTaskProject?.nom} » à l&apos;approbation finale
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
