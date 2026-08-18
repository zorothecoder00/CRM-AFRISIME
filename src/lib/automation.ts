import { prisma } from "@/lib/prisma";
import { createNotification, notifyMany } from "@/lib/notify";
import { TaskStatus, ProjectStatus, type AutomationTrigger } from "@/generated/prisma/enums";
import type { AutomationRule, AutomationCondition } from "@/generated/prisma/client";
import { evaluateConditions, type ConditionData } from "@/lib/automation-conditions";
import { startValidationRun } from "@/lib/validation-workflow";
import { startAdminRequestValidationRun } from "@/lib/admin-request-workflow";
import { REPORT_TYPES } from "@/lib/reports";

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.A_FAIRE,
  TaskStatus.EN_COURS,
  TaskStatus.EN_REVISION,
  TaskStatus.BLOQUEE,
];

const TASK_STATUS_VALUES = new Set<string>(Object.values(TaskStatus));
const PROJECT_STATUS_VALUES = new Set<string>(Object.values(ProjectStatus));

// Ecart cible/actuel a partir duquel un Indicator declenche INDICATOR_OFF_TARGET.
const INDICATOR_OFF_TARGET_THRESHOLD_PERCENT = 20;

type AutomationRuleWithConditions = AutomationRule & { conditions: AutomationCondition[] };

type AutomationContext = {
  entityType: string;
  entityId: string;
  label: string;
  // Optionnel depuis V2.2 (§7) : une règle peut être globale, déclenchée par
  // un événement non lié à un projet (opportunité, décision de gouvernance...).
  projectId?: string | null;
  /** Destinataire ciblé pour SEND_REMINDER (ex. responsable de la tâche/du projet). */
  targetUserId?: string;
  /** Données exposées à evaluateConditions (V2.2 §7.2), voir automation-conditions.ts. */
  conditionData?: ConditionData;
};

/**
 * Règles actives pour un déclencheur donné, triées par `ordre` (les étapes
 * d'un même OrchestrationPlaybook s'exécutent ainsi dans l'ordre défini —
 * V2.2 §8 ; les règles indépendantes, dont l'ordre par défaut est 0, ne sont
 * pas affectées). `scopeProjectId` filtre aux règles globales + celles du
 * projet concerné ; omis pour les déclencheurs non liés à un projet.
 */
async function findActiveRules(
  trigger: AutomationTrigger,
  scopeProjectId?: string | null
): Promise<AutomationRuleWithConditions[]> {
  return prisma.automationRule.findMany({
    where: {
      trigger,
      isActive: true,
      ...(scopeProjectId !== undefined ? { OR: [{ projectId: null }, { projectId: scopeProjectId }] } : {}),
    },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });
}

/**
 * Dispatcheur générique : n'importe quel déclencheur peut être associé à
 * n'importe quelle action (cahier des charges §15). Déduplique via
 * AutomationExecution pour qu'une règle ne se déclenche qu'une fois par
 * entité déclenchante (évite le spam si la page qui déclenche l'évaluation
 * est revisitée, ex. échéance proche). Les conditions (V2.2 §7.2) sont
 * évaluées après la dédup mais ne créent PAS d'entrée si elles échouent : un
 * skip par conditions doit rester ré-évaluable plus tard (ex. un retard qui
 * dépasse le seuil seulement au bout de quelques jours), contrairement à une
 * exécution effective. `visited` évite les boucles sur TRIGGER_WORKFLOW.
 */
async function executeAction(
  rule: AutomationRuleWithConditions,
  context: AutomationContext,
  visited: Set<string> = new Set()
) {
  const already = await prisma.automationExecution.findFirst({
    where: { ruleId: rule.id, entityType: context.entityType, entityId: context.entityId },
  });
  if (already) return;

  if (!evaluateConditions(rule.conditions, context.conditionData ?? {})) {
    // Branche ELSE (V2.2 §7.2) : conditions fausses -> execute elseRule
    // (une regle complete, avec sa propre action) au lieu de ne rien faire.
    if (rule.elseRuleId && !visited.has(rule.elseRuleId)) {
      const elseRule = await prisma.automationRule.findUnique({
        where: { id: rule.elseRuleId },
        include: { conditions: true },
      });
      if (elseRule?.isActive) {
        visited.add(rule.id);
        await executeAction(elseRule, context, visited);
      }
    }
    return;
  }

  switch (rule.action) {
    case "CREATE_NEXT_TASK": {
      if (!rule.nextTaskTitre || !rule.nextTaskResponsableId || !context.projectId) {
        await logExecution(rule.id, context, "Ignorée : titre, responsable ou projet non déterminé.");
        return;
      }
      const task = await prisma.task.create({
        data: {
          projectId: context.projectId,
          titre: rule.nextTaskTitre,
          responsablePrincipalId: rule.nextTaskResponsableId,
          createdById: rule.createdById,
          echeance: rule.nextTaskDelaiJours
            ? new Date(Date.now() + rule.nextTaskDelaiJours * 24 * 60 * 60 * 1000)
            : undefined,
          creeParWorkflow: true,
        },
      });
      await createNotification({
        userId: rule.nextTaskResponsableId,
        type: "NOUVELLE_TACHE",
        titre: `Nouvelle tâche assignée (automatisation « ${rule.nom} ») : ${task.titre}`,
        lien: `/taches/${task.id}`,
        entityType: "Task",
        entityId: task.id,
      });
      await logExecution(rule.id, context, `Tâche créée : « ${task.titre} ».`);
      return;
    }

    case "SEND_REMINDER": {
      if (!context.targetUserId) {
        await logExecution(rule.id, context, "Ignorée : aucun destinataire déterminé.");
        return;
      }
      await createNotification({
        userId: context.targetUserId,
        type: "RETARD",
        titre: `Rappel (automatisation « ${rule.nom} ») : ${context.label}`,
        lien: context.projectId ? `/projets/${context.projectId}` : undefined,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, "Rappel envoyé.");
      return;
    }

    case "NOTIFY_STAKEHOLDERS": {
      if (!context.projectId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite un projet.");
        return;
      }
      const project = await prisma.project.findUniqueOrThrow({
        where: { id: context.projectId },
        include: { members: true },
      });
      const stakeholderIds = [project.responsableId, ...project.members.map((m) => m.userId)];
      await notifyMany(stakeholderIds, "", {
        type: "MODIFICATION",
        titre: `Automatisation « ${rule.nom} » : ${context.label}`,
        lien: `/projets/${context.projectId}`,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, `${stakeholderIds.length} partie(s) prenante(s) notifiée(s).`);
      return;
    }

    case "ESCALATE_TO_MANAGER": {
      if (!context.targetUserId) {
        await logExecution(rule.id, context, "Ignorée : aucun destinataire déterminé.");
        return;
      }
      const target = await prisma.user.findUnique({
        where: { id: context.targetUserId },
        select: { managerId: true },
      });
      if (!target?.managerId) {
        await logExecution(rule.id, context, "Ignorée : le responsable n'a pas de manager renseigné.");
        return;
      }
      await createNotification({
        userId: target.managerId,
        type: "RETARD",
        titre: `[Escalade] Automatisation « ${rule.nom} » : ${context.label}`,
        lien: context.projectId ? `/projets/${context.projectId}` : undefined,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, "Manager notifié.");
      return;
    }

    case "MARK_TASK_BLOCKED": {
      if (context.entityType !== "Task") {
        await logExecution(rule.id, context, "Ignorée : cette action ne s'applique qu'à une tâche.");
        return;
      }
      const task = await prisma.task.findUnique({
        where: { id: context.entityId },
        select: { statut: true },
      });
      if (!task || task.statut === "TERMINEE" || task.statut === "ANNULEE" || task.statut === "BLOQUEE") {
        await logExecution(rule.id, context, "Ignorée : tâche déjà terminée, annulée ou bloquée.");
        return;
      }
      await prisma.task.update({ where: { id: context.entityId }, data: { statut: "BLOQUEE" } });
      await logExecution(rule.id, context, "Tâche marquée comme bloquée.");
      return;
    }

    // ---- V2.2 §7.3 — nouvelles actions ----

    case "ASSIGN_USER": {
      if (context.entityType !== "Task" || !rule.assignUserId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite une tâche et un utilisateur configuré.");
        return;
      }
      await prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId: context.entityId, userId: rule.assignUserId } },
        create: { taskId: context.entityId, userId: rule.assignUserId },
        update: {},
      });
      await createNotification({
        userId: rule.assignUserId,
        type: "NOUVELLE_TACHE",
        titre: `Assigné(e) (automatisation « ${rule.nom} ») : ${context.label}`,
        lien: `/taches/${context.entityId}`,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, "Utilisateur assigné.");
      return;
    }

    case "SEND_EMAIL": {
      // Aucun fournisseur d'email n'est configuré dans ce MVP (V2.2 §7,
      // décision produit) : on journalise l'intention sans envoi réel.
      await logExecution(
        rule.id,
        context,
        `Email non envoyé (aucun fournisseur configuré) — destinataire prévu : ${context.targetUserId ?? "non déterminé"}.`
      );
      return;
    }

    case "CHANGE_STATUS": {
      if (!rule.changeStatusValue) {
        await logExecution(rule.id, context, "Ignorée : aucun statut cible configuré.");
        return;
      }
      if (context.entityType === "Task" && TASK_STATUS_VALUES.has(rule.changeStatusValue)) {
        await prisma.task.update({
          where: { id: context.entityId },
          data: { statut: rule.changeStatusValue as TaskStatus },
        });
        await logExecution(rule.id, context, `Statut de la tâche changé en ${rule.changeStatusValue}.`);
        return;
      }
      if (context.entityType === "Project" && PROJECT_STATUS_VALUES.has(rule.changeStatusValue)) {
        await prisma.project.update({
          where: { id: context.entityId },
          data: { statut: rule.changeStatusValue as ProjectStatus },
        });
        await logExecution(rule.id, context, `Statut du projet changé en ${rule.changeStatusValue}.`);
        return;
      }
      await logExecution(rule.id, context, "Ignorée : statut cible incompatible avec l'entité déclenchante.");
      return;
    }

    case "CREATE_MEETING": {
      const projectId = rule.projectId ?? context.projectId;
      if (!projectId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite un projet.");
        return;
      }
      const meeting = await prisma.meeting.create({
        data: {
          projectId,
          titre: rule.meetingTitre || `Réunion (automatisation « ${rule.nom} ») : ${context.label}`,
          dateHeure: new Date(Date.now() + (rule.meetingDelaiJours ?? 3) * 24 * 60 * 60 * 1000),
          createdById: rule.createdById,
          participants: { create: [{ userId: rule.createdById }] },
        },
      });
      await logExecution(rule.id, context, `Réunion créée : « ${meeting.titre} ».`);
      return;
    }

    case "CREATE_ADMIN_REQUEST": {
      if (!rule.adminRequestType) {
        await logExecution(rule.id, context, "Ignorée : type de demande non configuré.");
        return;
      }
      const adminRequest = await prisma.adminRequest.create({
        data: {
          type: rule.adminRequestType,
          titre: rule.adminRequestTitre || `Demande (automatisation « ${rule.nom} ») : ${context.label}`,
          demandeurId: rule.createdById,
        },
      });
      try {
        await startAdminRequestValidationRun({
          adminRequestId: adminRequest.id,
          titre: adminRequest.titre,
          submittedById: rule.createdById,
          type: adminRequest.type,
          montant: null,
        });
        await logExecution(rule.id, context, `Demande créée et circuit de validation démarré : « ${adminRequest.titre} ».`);
      } catch (error) {
        await logExecution(
          rule.id,
          context,
          `Demande créée mais circuit de validation non démarré : ${error instanceof Error ? error.message : "erreur inconnue"}.`
        );
      }
      return;
    }

    case "CREATE_RISK": {
      const projectId = rule.projectId ?? context.projectId;
      if (!projectId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite un projet.");
        return;
      }
      const risk = await prisma.projectRisk.create({
        data: {
          projectId,
          titre: rule.riskTitre || `Risque (automatisation « ${rule.nom} ») : ${context.label}`,
          probabilite: rule.riskProbabilite ?? "MOYENNE",
          impact: rule.riskImpact ?? "MOYEN",
          createdById: rule.createdById,
        },
      });
      await logExecution(rule.id, context, `Risque créé : « ${risk.titre} ».`);
      return;
    }

    case "GENERATE_REPORT": {
      const reportType = rule.reportType && (REPORT_TYPES as readonly string[]).includes(rule.reportType)
        ? rule.reportType
        : null;
      if (!reportType || !context.targetUserId) {
        await logExecution(rule.id, context, "Ignorée : type de rapport ou destinataire non déterminé.");
        return;
      }
      await createNotification({
        userId: context.targetUserId,
        type: "MODIFICATION",
        titre: `Rapport généré (automatisation « ${rule.nom} ») : ${context.label}`,
        lien: `/rapports?type=${reportType}`,
        entityType: context.entityType,
        entityId: context.entityId,
      });
      await logExecution(rule.id, context, `Lien vers le rapport ${reportType} envoyé.`);
      return;
    }

    case "REQUEST_VALIDATION": {
      if (context.entityType !== "Task") {
        await logExecution(rule.id, context, "Ignorée : cette action ne s'applique qu'à une tâche.");
        return;
      }
      try {
        await startValidationRun({ taskId: context.entityId, taskTitre: context.label, submittedById: rule.createdById });
        await prisma.task.update({ where: { id: context.entityId }, data: { statut: "EN_REVISION" } });
        await logExecution(rule.id, context, "Validation demandée.");
      } catch (error) {
        await logExecution(
          rule.id,
          context,
          `Validation non demandée : ${error instanceof Error ? error.message : "erreur inconnue"}.`
        );
      }
      return;
    }

    case "TRIGGER_WORKFLOW": {
      if (!rule.targetRuleId || visited.has(rule.targetRuleId)) {
        await logExecution(rule.id, context, "Ignorée : règle cible non configurée ou boucle détectée.");
        return;
      }
      const targetRule = await prisma.automationRule.findUnique({
        where: { id: rule.targetRuleId },
        include: { conditions: true },
      });
      if (!targetRule || !targetRule.isActive) {
        await logExecution(rule.id, context, "Ignorée : règle cible introuvable ou inactive.");
        return;
      }
      visited.add(rule.id);
      await executeAction(targetRule, context, visited);
      await logExecution(rule.id, context, `Règle « ${targetRule.nom} » déclenchée.`);
      return;
    }

    // ---- V2.2 §8 — actions du playbook de mise en route ----

    case "VERIFY_RESOURCES": {
      const projectId = rule.projectId ?? context.projectId;
      if (!projectId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite un projet.");
        return;
      }
      const count = await prisma.projectResource.count({ where: { projectId } });
      if (count === 0 && context.targetUserId) {
        await createNotification({
          userId: context.targetUserId,
          type: "MODIFICATION",
          titre: `Aucune ressource déclarée pour le projet : ${context.label}`,
          lien: `/projets/${projectId}`,
          entityType: "Project",
          entityId: projectId,
        });
      }
      await logExecution(rule.id, context, `${count} ressource(s) déclarée(s).`);
      return;
    }

    case "VERIFY_RISKS": {
      const projectId = rule.projectId ?? context.projectId;
      if (!projectId) {
        await logExecution(rule.id, context, "Ignorée : cette action nécessite un projet.");
        return;
      }
      const count = await prisma.projectRisk.count({ where: { projectId, statut: { notIn: ["MAITRISE", "CLOS"] } } });
      if (count === 0 && context.targetUserId) {
        await createNotification({
          userId: context.targetUserId,
          type: "MODIFICATION",
          titre: `Aucun risque identifié pour le projet : ${context.label}`,
          lien: `/projets/${projectId}`,
          entityType: "Project",
          entityId: projectId,
        });
      }
      await logExecution(rule.id, context, `${count} risque(s) actif(s).`);
      return;
    }

    case "OPEN_TRACKING_BOARD": {
      const projectId = rule.projectId ?? context.projectId;
      if (!projectId || !context.targetUserId) {
        await logExecution(rule.id, context, "Ignorée : projet ou destinataire non déterminé.");
        return;
      }
      await createNotification({
        userId: context.targetUserId,
        type: "MODIFICATION",
        titre: `Tableau de suivi disponible : ${context.label}`,
        lien: `/projets/${projectId}`,
        entityType: "Project",
        entityId: projectId,
      });
      await logExecution(rule.id, context, "Tableau de suivi ouvert.");
      return;
    }

    case "CREATE_DEADLINE": {
      // Comble V2.2 §7.3 : pas de nouveau modele dedie, reutilise Event
      // (deja consolide au calendrier avec taches/reunions/conges).
      const event = await prisma.event.create({
        data: {
          titre: rule.deadlineTitre || `Échéance (automatisation « ${rule.nom} ») : ${context.label}`,
          dateDebut: new Date(Date.now() + (rule.deadlineDelaiJours ?? 7) * 24 * 60 * 60 * 1000),
          projectId: context.projectId ?? undefined,
          createdById: rule.createdById,
        },
      });
      await logExecution(rule.id, context, `Échéance créée : « ${event.titre} ».`);
      return;
    }
  }
}

async function logExecution(ruleId: string, context: AutomationContext, resultat: string) {
  await prisma.automationExecution.create({
    data: { ruleId, entityType: context.entityType, entityId: context.entityId, resultat },
  });
}

export async function runTaskCompletedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
}) {
  const rules = await findActiveRules("TASK_COMPLETED", task.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
    });
  }
}

export async function runValidationRejectedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
}) {
  const rules = await findActiveRules("TASK_VALIDATION_REJECTED", task.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
    });
  }
}

export async function runProjectCompletedRules(project: {
  id: string;
  nom: string;
  responsableId: string;
}) {
  const rules = await findActiveRules("PROJECT_COMPLETED", project.id);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Project",
      entityId: project.id,
      label: project.nom,
      projectId: project.id,
      targetUserId: project.responsableId,
    });
  }
}

/**
 * Évalue les règles DEADLINE_APPROACHING pour les tâches actives de
 * l'utilisateur, à la visite (même approche que les notifications
 * d'échéance — pas de vrai ordonnanceur dans ce MVP).
 */
export async function runDeadlineApproachingRules(userId: string) {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "DEADLINE_APPROACHING", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const days = rule.reminderDelaiJours ?? 3;
    const soon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        ...(rule.projectId ? { projectId: rule.projectId } : {}),
        OR: [{ responsablePrincipalId: userId }, { assignees: { some: { userId } } }],
        statut: { in: ACTIVE_TASK_STATUSES },
        echeance: { not: null, lte: soon, gte: new Date() },
      },
      select: { id: true, titre: true, projectId: true, responsablePrincipalId: true },
    });

    for (const task of tasks) {
      await executeAction(rule, {
        entityType: "Task",
        entityId: task.id,
        label: task.titre,
        projectId: task.projectId,
        targetUserId: task.responsablePrincipalId,
      });
    }
  }
}

/**
 * Déclencheurs évalués par le cron quotidien (cahier des charges §22),
 * plutôt qu'à la visite d'une page — contrairement à
 * runDeadlineApproachingRules ci-dessus, celui-ci ne dépend pas de
 * l'utilisateur qui consulte l'app : appelé une fois par jour pour
 * l'ensemble des projets concernés.
 */
export async function runTaskOverdueRules() {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "TASK_OVERDUE", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const tasks = await prisma.task.findMany({
      where: {
        ...(rule.projectId ? { projectId: rule.projectId } : {}),
        statut: { in: ACTIVE_TASK_STATUSES },
        echeance: { not: null, lt: new Date() },
      },
      select: { id: true, titre: true, projectId: true, responsablePrincipalId: true, echeance: true, priorite: true },
    });
    for (const task of tasks) {
      const retardJours = task.echeance ? Math.floor((Date.now() - task.echeance.getTime()) / (24 * 60 * 60 * 1000)) : 0;
      await executeAction(rule, {
        entityType: "Task",
        entityId: task.id,
        label: task.titre,
        projectId: task.projectId,
        targetUserId: task.responsablePrincipalId,
        conditionData: { "task.retardJours": retardJours, "task.priorite": task.priorite },
      });
    }
  }
}

export async function runProjectOverdueRules() {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "PROJECT_OVERDUE", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const project = await prisma.project.findFirst({
      where: { ...(rule.projectId ? { id: rule.projectId } : {}), statut: "EN_COURS", dateFin: { lt: new Date() } },
      select: { id: true, nom: true, responsableId: true, dateFin: true, priorite: true },
    });
    if (!project) continue;
    const retardJours = project.dateFin ? Math.floor((Date.now() - project.dateFin.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    await executeAction(rule, {
      entityType: "Project",
      entityId: project.id,
      label: project.nom,
      projectId: project.id,
      targetUserId: project.responsableId,
      conditionData: { "project.retardJours": retardJours, "project.critique": project.priorite === "CRITIQUE" },
    });
  }
}

export async function runBudgetExceededRules() {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "BUDGET_EXCEEDED", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const project = await prisma.project.findFirst({
      where: { ...(rule.projectId ? { id: rule.projectId } : {}), budget: { not: null }, coutReel: { not: null } },
      select: { id: true, nom: true, budget: true, coutReel: true, responsableId: true },
    });
    if (!project || Number(project.coutReel) <= Number(project.budget)) continue;
    await executeAction(rule, {
      entityType: "Project",
      entityId: project.id,
      label: project.nom,
      projectId: project.id,
      targetUserId: project.responsableId,
      conditionData: { "project.budgetDepasse": true },
    });
  }
}

export async function runRiskCriticalRules() {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "RISK_CRITICAL", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const risks = await prisma.projectRisk.findMany({
      where: {
        ...(rule.projectId ? { projectId: rule.projectId } : {}),
        statut: { notIn: ["MAITRISE", "CLOS"] },
        OR: [{ probabilite: "ELEVEE" }, { impact: "ELEVE" }],
      },
      select: { id: true, titre: true, projectId: true, responsableId: true, probabilite: true, impact: true },
    });
    for (const risk of risks) {
      await executeAction(rule, {
        entityType: "ProjectRisk",
        entityId: risk.id,
        label: risk.titre,
        projectId: risk.projectId,
        targetUserId: risk.responsableId ?? undefined,
        conditionData: { "risk.probabilite": risk.probabilite, "risk.impact": risk.impact },
      });
    }
  }
}

// ---- V2.2 §7.1 — nouveaux déclencheurs événementiels ----
// Appelés inline depuis le point de création/changement concerné (voir
// les actions serveur correspondantes), plutôt que par le cron : "nouveau X"
// est un événement immédiat, pas une condition à réévaluer périodiquement.

export async function runTaskCreatedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
  priorite: string;
}) {
  const rules = await findActiveRules("TASK_CREATED", task.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
      conditionData: { "task.priorite": task.priorite },
    });
  }
}

export async function runTaskStatusChangedRules(task: {
  id: string;
  titre: string;
  projectId: string;
  responsablePrincipalId: string;
  priorite: string;
}) {
  const rules = await findActiveRules("TASK_STATUS_CHANGED", task.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Task",
      entityId: task.id,
      label: task.titre,
      projectId: task.projectId,
      targetUserId: task.responsablePrincipalId,
      conditionData: { "task.priorite": task.priorite },
    });
  }
}

export async function runProjectStatusChangedRules(project: {
  id: string;
  nom: string;
  responsableId: string;
  statut: string;
}) {
  const rules = await findActiveRules("PROJECT_STATUS_CHANGED", project.id);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Project",
      entityId: project.id,
      label: project.nom,
      projectId: project.id,
      targetUserId: project.responsableId,
      conditionData: { "project.statut": project.statut },
    });
  }
}

/** Comble V2.2 §7.1 "nouveau contrat" (modèle Contract ajouté pour combler ce trou). */
export async function runContractCreatedRules(contract: {
  id: string;
  nom: string;
  createdById: string;
  montant: number | null;
}) {
  const rules = await findActiveRules("CONTRACT_CREATED");
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Contract",
      entityId: contract.id,
      label: contract.nom,
      targetUserId: contract.createdById,
      conditionData: { "contract.montant": contract.montant ?? 0 },
    });
  }
}

export async function runOpportunityCreatedRules(opportunity: {
  id: string;
  nom: string;
  ownerId: string;
  montantEstime: number | null;
  probabilite: number | null;
}) {
  const rules = await findActiveRules("OPPORTUNITY_CREATED");
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "CrmOpportunity",
      entityId: opportunity.id,
      label: opportunity.nom,
      targetUserId: opportunity.ownerId,
      conditionData: {
        "opportunity.probabilite": opportunity.probabilite ?? 0,
        "opportunity.montantEstime": opportunity.montantEstime ?? 0,
      },
    });
  }
}

export async function runProjectRiskCreatedRules(risk: {
  id: string;
  titre: string;
  projectId: string;
  responsableId: string | null;
  probabilite: string;
  impact: string;
}) {
  const rules = await findActiveRules("RISK_CREATED", risk.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "ProjectRisk",
      entityId: risk.id,
      label: risk.titre,
      projectId: risk.projectId,
      targetUserId: risk.responsableId ?? undefined,
      conditionData: { "risk.probabilite": risk.probabilite, "risk.impact": risk.impact },
    });
  }
}

export async function runOrganizationalRiskCreatedRules(risk: {
  id: string;
  titre: string;
  responsableId: string | null;
  criticite: string;
}) {
  const rules = await findActiveRules("RISK_CREATED");
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "OrganizationalRisk",
      entityId: risk.id,
      label: risk.titre,
      targetUserId: risk.responsableId ?? undefined,
      conditionData: { "risk.criticite": risk.criticite },
    });
  }
}

export async function runMeetingDecisionCreatedRules(decision: {
  id: string;
  description: string;
  projectId: string | null;
  responsableId: string | null;
}) {
  const rules = await findActiveRules("DECISION_CREATED", decision.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "MeetingDecision",
      entityId: decision.id,
      label: decision.description,
      projectId: decision.projectId,
      targetUserId: decision.responsableId ?? undefined,
    });
  }
}

export async function runGovernanceDecisionCreatedRules(decision: {
  id: string;
  objet: string;
  responsableId: string | null;
}) {
  const rules = await findActiveRules("DECISION_CREATED");
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "GovernanceDecision",
      entityId: decision.id,
      label: decision.objet,
      targetUserId: decision.responsableId ?? undefined,
    });
  }
}

export async function runMeetingCreatedRules(meeting: {
  id: string;
  titre: string;
  projectId: string;
  createdById: string;
}) {
  const rules = await findActiveRules("MEETING_CREATED", meeting.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Meeting",
      entityId: meeting.id,
      label: meeting.titre,
      projectId: meeting.projectId,
      targetUserId: meeting.createdById,
    });
  }
}

export async function runEventCreatedRules(event: {
  id: string;
  titre: string;
  projectId: string | null;
  createdById: string;
}) {
  const rules = await findActiveRules("EVENT_CREATED", event.projectId);
  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "Event",
      entityId: event.id,
      label: event.titre,
      projectId: event.projectId,
      targetUserId: event.createdById,
    });
  }
}

/** Cron quotidien (V2.2 §7.1) : Indicator dont l'écart cible/actuel dépasse le seuil. */
export async function runIndicatorOffTargetRules() {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "INDICATOR_OFF_TARGET", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    const indicators = await prisma.indicator.findMany({
      where: { ...(rule.projectId ? { projectId: rule.projectId } : {}), valeurCible: { gt: 0 } },
      select: { id: true, nom: true, valeurCible: true, valeurActuelle: true, projectId: true },
    });
    for (const indicator of indicators) {
      const ecart = Math.round(
        ((Number(indicator.valeurActuelle) - Number(indicator.valeurCible)) / Number(indicator.valeurCible)) * 100
      );
      if (Math.abs(ecart) < INDICATOR_OFF_TARGET_THRESHOLD_PERCENT) continue;
      await executeAction(rule, {
        entityType: "Indicator",
        entityId: indicator.id,
        label: indicator.nom,
        projectId: indicator.projectId,
        conditionData: { "indicator.ecartPourcent": ecart },
      });
    }
  }
}

/**
 * Automatisation inter-systèmes (V2.2 §35) — déclenchée depuis la route
 * webhook entrante (/api/webhooks/[integrationId]) juste après la
 * journalisation de l'IntegrationEvent, pas depuis le cron quotidien.
 * `entityId` = event.id (unique par appel) : contrairement aux autres
 * déclencheurs, un même type d'événement peut donc redéclencher la règle à
 * chaque réception, ce qui est le comportement attendu pour un flux
 * d'événements répétés (ex. plusieurs factures créées côté AfriGes). Une
 * règle scopée à un projet (rule.projectId) reçoit ce projet comme
 * context.projectId — c'est ce qui permet à CREATE_NEXT_TASK de fonctionner
 * ("→ création d'une tâche" dans l'exemple du cahier des charges) ; une
 * règle globale (projectId null) ne peut déclencher que les actions qui
 * n'exigent pas de projet (SEND_EMAIL, etc.).
 *
 * "→ mise à jour KPI" est satisfaite indépendamment des règles configurées :
 * chaque événement reçu incrémente un MetricSnapshot (entityType=
 * "Integration", metric=eventType), déjà consommé par le module prédictif
 * (§11) et surfacé sur les dashboards existants — pas de nouveau widget.
 */
export async function runIntegrationEventRules(event: {
  id: string;
  integrationId: string;
  integrationType: string;
  eventType: string;
}) {
  await prisma.metricSnapshot.create({
    data: { entityType: "Integration", entityId: event.integrationId, metric: event.eventType, valeur: 1 },
  });

  const rules = await prisma.automationRule.findMany({
    where: { trigger: "INTEGRATION_EVENT_RECEIVED", isActive: true },
    include: { conditions: true },
    orderBy: { ordre: "asc" },
  });

  for (const rule of rules) {
    await executeAction(rule, {
      entityType: "IntegrationEvent",
      entityId: event.id,
      label: `${event.eventType} (${event.integrationType})`,
      projectId: rule.projectId,
      conditionData: { "integration.eventType": event.eventType, "integration.type": event.integrationType },
    });
  }
}
