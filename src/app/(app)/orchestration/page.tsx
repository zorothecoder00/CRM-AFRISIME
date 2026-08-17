import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaybookFormDialog } from "@/components/automation/playbook-form-dialog";
import { TogglePlaybookButton } from "@/components/automation/toggle-playbook-button";

const TRIGGER_LABELS: Record<string, string> = {
  PROJECT_STATUS_CHANGED: "Le statut du projet change",
  TASK_COMPLETED: "Une tâche est terminée",
  PROJECT_COMPLETED: "Le projet atteint 100 %",
  TASK_CREATED: "Une tâche est créée",
  OPPORTUNITY_CREATED: "Une nouvelle opportunité CRM est créée",
  RISK_CREATED: "Un nouveau risque est créé",
  DECISION_CREATED: "Une décision est prise",
};

const ACTION_LABELS: Record<string, string> = {
  VERIFY_RESOURCES: "Vérifier les ressources",
  VERIFY_RISKS: "Vérifier les risques",
  CREATE_NEXT_TASK: "Créer une tâche",
  ASSIGN_USER: "Assigner un utilisateur",
  CREATE_MEETING: "Programmer une réunion",
  NOTIFY_STAKEHOLDERS: "Informer les parties prenantes",
  OPEN_TRACKING_BOARD: "Ouvrir le tableau de suivi",
  CREATE_ADMIN_REQUEST: "Créer une demande",
  CREATE_RISK: "Créer un risque",
  SEND_REMINDER: "Envoyer un rappel",
  CHANGE_STATUS: "Modifier le statut",
  REQUEST_VALIDATION: "Demander une validation",
  GENERATE_REPORT: "Générer un rapport",
};

/**
 * V2.2 §8 — orchestration : un déclencheur, plusieurs actions nommées
 * exécutées dans l'ordre. Chaque étape est une AutomationRule rattachée au
 * playbook (playbookId + ordre) ; l'exécution réutilise entièrement le
 * moteur de src/lib/automation.ts, pas de moteur dédié.
 */
export default async function OrchestrationPage() {
  const session = await getServerSession(authOptions);
  const canManage = session!.user.permissions.includes(PERMISSIONS.AUTOMATION_MANAGE);

  const [playbooks, projects, users] = await Promise.all([
    prisma.orchestrationPlaybook.findMany({
      include: {
        project: { select: { nom: true } },
        steps: { orderBy: { ordre: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orchestration</h1>
          <p className="text-sm text-muted-foreground">
            Playbooks : un déclencheur, plusieurs actions exécutées dans l&apos;ordre.
          </p>
        </div>
        {canManage && (
          <PlaybookFormDialog
            projects={projects.map((p) => ({ id: p.id, label: p.nom }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        )}
      </div>

      {playbooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun playbook créé pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {playbooks.map((pb) => (
            <Card key={pb.id} accent={pb.isActive ? "success" : "none"}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{pb.nom}</CardTitle>
                  {pb.description && <p className="text-sm text-muted-foreground">{pb.description}</p>}
                </div>
                {canManage && <TogglePlaybookButton playbookId={pb.id} isActive={pb.isActive} />}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">Si : {TRIGGER_LABELS[pb.trigger] ?? pb.trigger}</Badge>
                  <Badge variant="secondary">{pb.project?.nom ?? "Global"}</Badge>
                  {!pb.isActive && <Badge variant="destructive">Désactivé</Badge>}
                </div>
                <ol className="space-y-1 pl-5 text-sm">
                  {pb.steps.map((step) => (
                    <li key={step.id} className="list-decimal">
                      <span className="font-medium">{step.nom}</span>{" "}
                      <span className="text-muted-foreground">— {ACTION_LABELS[step.action] ?? step.action}</span>
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
