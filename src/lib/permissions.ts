export const PERMISSIONS = {
  PROJECT_CREATE: "project.create",
  PROJECT_READ: "project.read",
  PROJECT_UPDATE: "project.update",
  PROJECT_DELETE: "project.delete",
  PROJECT_VALIDATE: "project.validate",
  PROJECT_EXPORT: "project.export",
  PROJECT_MANAGE_MEMBERS: "project.manage_members",

  SECTION_CREATE: "section.create",
  SECTION_UPDATE: "section.update",
  SECTION_DELETE: "section.delete",

  TASK_CREATE: "task.create",
  TASK_READ: "task.read",
  TASK_UPDATE: "task.update",
  TASK_DELETE: "task.delete",
  TASK_ASSIGN: "task.assign",
  TASK_VALIDATE: "task.validate",
  TASK_COMMENT: "task.comment",
  TASK_EXPORT: "task.export",

  WORKFLOW_MANAGE: "workflow.manage",

  MEETING_CREATE: "meeting.create",
  MEETING_READ: "meeting.read",
  MEETING_UPDATE: "meeting.update",
  MEETING_DELETE: "meeting.delete",
  MEETING_MANAGE_PARTICIPANTS: "meeting.manage_participants",

  DOCUMENT_CREATE: "document.create",
  DOCUMENT_READ: "document.read",
  DOCUMENT_UPDATE: "document.update",
  DOCUMENT_DELETE: "document.delete",
  DOCUMENT_MANAGE_FOLDERS: "document.manage_folders",

  LEAVE_CREATE: "leave.create",
  LEAVE_MANAGE: "leave.manage",
  EVENT_CREATE: "event.create",

  OBJECTIVE_CREATE: "objective.create",
  OBJECTIVE_READ: "objective.read",
  OBJECTIVE_UPDATE: "objective.update",
  OBJECTIVE_DELETE: "objective.delete",

  WORKLOAD_READ: "workload.read",
  WORKLOAD_MANAGE: "workload.manage",

  MESSAGE_CREATE: "message.create",
  MESSAGE_READ: "message.read",

  AUTOMATION_MANAGE: "automation.manage",
  AUTOMATION_READ: "automation.read",

  DASHBOARD_READ: "dashboard.read",

  REPORT_EXPORT: "report.export",

  SECURITY_AUDIT_READ: "security.audit.read",

  INTEGRATION_MANAGE: "integration.manage",

  DEPARTMENT_MANAGE: "department.manage",

  ADMINISTRATION_ACCESS: "administration.access",
  ADMINISTRATION_USERS_MANAGE: "administration.users.manage",
  ADMINISTRATION_ROLES_MANAGE: "administration.roles.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: {
  key: PermissionKey;
  label: string;
  category: string;
}[] = [
  { key: PERMISSIONS.PROJECT_CREATE, label: "Créer un projet", category: "Projets" },
  { key: PERMISSIONS.PROJECT_READ, label: "Consulter les projets", category: "Projets" },
  { key: PERMISSIONS.PROJECT_UPDATE, label: "Modifier un projet", category: "Projets" },
  { key: PERMISSIONS.PROJECT_DELETE, label: "Supprimer un projet", category: "Projets" },
  { key: PERMISSIONS.PROJECT_VALIDATE, label: "Valider un projet", category: "Projets" },
  { key: PERMISSIONS.PROJECT_EXPORT, label: "Exporter un projet", category: "Projets" },
  { key: PERMISSIONS.PROJECT_MANAGE_MEMBERS, label: "Gérer les membres du projet", category: "Projets" },

  { key: PERMISSIONS.SECTION_CREATE, label: "Créer une phase/sous-phase/lot", category: "Projets" },
  { key: PERMISSIONS.SECTION_UPDATE, label: "Modifier une phase/sous-phase/lot", category: "Projets" },
  { key: PERMISSIONS.SECTION_DELETE, label: "Supprimer une phase/sous-phase/lot", category: "Projets" },

  { key: PERMISSIONS.TASK_CREATE, label: "Créer une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_READ, label: "Consulter les tâches", category: "Tâches" },
  { key: PERMISSIONS.TASK_UPDATE, label: "Modifier une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_DELETE, label: "Supprimer une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_ASSIGN, label: "Assigner une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_VALIDATE, label: "Valider une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_COMMENT, label: "Commenter une tâche", category: "Tâches" },
  { key: PERMISSIONS.TASK_EXPORT, label: "Exporter les tâches", category: "Tâches" },
  { key: PERMISSIONS.WORKFLOW_MANAGE, label: "Configurer les circuits de validation", category: "Tâches" },

  { key: PERMISSIONS.MEETING_CREATE, label: "Créer une réunion", category: "Réunions" },
  { key: PERMISSIONS.MEETING_READ, label: "Consulter les réunions", category: "Réunions" },
  { key: PERMISSIONS.MEETING_UPDATE, label: "Modifier une réunion", category: "Réunions" },
  { key: PERMISSIONS.MEETING_DELETE, label: "Supprimer une réunion", category: "Réunions" },
  { key: PERMISSIONS.MEETING_MANAGE_PARTICIPANTS, label: "Gérer les participants", category: "Réunions" },

  { key: PERMISSIONS.DOCUMENT_CREATE, label: "Ajouter un document", category: "Documents" },
  { key: PERMISSIONS.DOCUMENT_READ, label: "Consulter les documents", category: "Documents" },
  { key: PERMISSIONS.DOCUMENT_UPDATE, label: "Modifier un document (nouvelle version)", category: "Documents" },
  { key: PERMISSIONS.DOCUMENT_DELETE, label: "Supprimer un document", category: "Documents" },
  { key: PERMISSIONS.DOCUMENT_MANAGE_FOLDERS, label: "Gérer les dossiers", category: "Documents" },

  { key: PERMISSIONS.LEAVE_CREATE, label: "Demander un congé", category: "Calendrier" },
  { key: PERMISSIONS.LEAVE_MANAGE, label: "Approuver/refuser les congés", category: "Calendrier" },
  { key: PERMISSIONS.EVENT_CREATE, label: "Créer un événement", category: "Calendrier" },

  { key: PERMISSIONS.OBJECTIVE_CREATE, label: "Créer un objectif", category: "Objectifs & KPI" },
  { key: PERMISSIONS.OBJECTIVE_READ, label: "Consulter les objectifs", category: "Objectifs & KPI" },
  { key: PERMISSIONS.OBJECTIVE_UPDATE, label: "Modifier un objectif / mettre à jour un indicateur", category: "Objectifs & KPI" },
  { key: PERMISSIONS.OBJECTIVE_DELETE, label: "Supprimer un objectif", category: "Objectifs & KPI" },

  { key: PERMISSIONS.WORKLOAD_READ, label: "Consulter la charge de l'équipe", category: "Charge de travail" },
  { key: PERMISSIONS.WORKLOAD_MANAGE, label: "Modifier la capacité des collaborateurs", category: "Charge de travail" },

  { key: PERMISSIONS.MESSAGE_CREATE, label: "Envoyer des messages", category: "Messagerie" },
  { key: PERMISSIONS.MESSAGE_READ, label: "Consulter la messagerie", category: "Messagerie" },

  { key: PERMISSIONS.AUTOMATION_MANAGE, label: "Créer et gérer les règles d'automatisation", category: "Automatisations" },
  { key: PERMISSIONS.AUTOMATION_READ, label: "Consulter les règles d'automatisation", category: "Automatisations" },

  { key: PERMISSIONS.DASHBOARD_READ, label: "Consulter les tableaux de bord", category: "Tableaux de bord" },

  { key: PERMISSIONS.REPORT_EXPORT, label: "Exporter des rapports (PDF/Excel/Word)", category: "Rapports" },

  { key: PERMISSIONS.SECURITY_AUDIT_READ, label: "Consulter le journal d'audit et l'état MFA", category: "Sécurité" },

  { key: PERMISSIONS.INTEGRATION_MANAGE, label: "Gérer les intégrations externes", category: "Intégrations" },

  { key: PERMISSIONS.DEPARTMENT_MANAGE, label: "Gérer un département", category: "Administration" },
  { key: PERMISSIONS.ADMINISTRATION_ACCESS, label: "Accéder à l'administration", category: "Administration" },
  { key: PERMISSIONS.ADMINISTRATION_USERS_MANAGE, label: "Gérer les utilisateurs", category: "Administration" },
  { key: PERMISSIONS.ADMINISTRATION_ROLES_MANAGE, label: "Gérer les rôles et permissions", category: "Administration" },
];

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.key);

/**
 * Matrice de permissions par défaut, utilisée par le seed pour peupler RolePermission.
 * Personnalisable ensuite depuis /administration/roles sans redéploiement.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  DIRECTEUR_GENERAL: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_VALIDATE,
    PERMISSIONS.PROJECT_EXPORT,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.SECTION_DELETE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_VALIDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.TASK_EXPORT,
    PERMISSIONS.WORKFLOW_MANAGE,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.MEETING_MANAGE_PARTICIPANTS,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_MANAGE_FOLDERS,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.WORKLOAD_MANAGE,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_MANAGE,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.ADMINISTRATION_ACCESS,
    PERMISSIONS.SECURITY_AUDIT_READ,
    PERMISSIONS.INTEGRATION_MANAGE,
  ],

  DIRECTEUR: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_VALIDATE,
    PERMISSIONS.PROJECT_EXPORT,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.SECTION_DELETE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_VALIDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.TASK_EXPORT,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.MEETING_MANAGE_PARTICIPANTS,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_MANAGE_FOLDERS,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.WORKLOAD_MANAGE,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_MANAGE,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.DEPARTMENT_MANAGE,
  ],

  CHEF_DEPARTEMENT: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_VALIDATE,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.SECTION_DELETE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_VALIDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.MEETING_MANAGE_PARTICIPANTS,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_MANAGE_FOLDERS,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.WORKLOAD_MANAGE,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_MANAGE,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.DEPARTMENT_MANAGE,
  ],

  CHEF_PROJET: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_MANAGE_MEMBERS,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.SECTION_DELETE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_VALIDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.MEETING_MANAGE_PARTICIPANTS,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.DOCUMENT_MANAGE_FOLDERS,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_MANAGE,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
  ],

  RESPONSABLE: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.SECTION_CREATE,
    PERMISSIONS.SECTION_UPDATE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_VALIDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
  ],

  MANAGER: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_CREATE,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.MEETING_UPDATE,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPDATE,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.WORKLOAD_READ,
    PERMISSIONS.WORKLOAD_MANAGE,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORT_EXPORT,
  ],

  COLLABORATEUR: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.DOCUMENT_CREATE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.LEAVE_CREATE,
    PERMISSIONS.OBJECTIVE_CREATE,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.OBJECTIVE_UPDATE,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
  ],

  CONSULTANT_EXTERNE: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
  ],

  PRESTATAIRE: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_COMMENT,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
  ],

  INVITE: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.MEETING_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.OBJECTIVE_READ,
    PERMISSIONS.MESSAGE_CREATE,
    PERMISSIONS.MESSAGE_READ,
  ],
};

export function hasPermission(
  permissions: string[] | undefined,
  key: PermissionKey
): boolean {
  return !!permissions?.includes(key);
}

export function requirePermission(
  permissions: string[] | undefined,
  key: PermissionKey
): void {
  if (!hasPermission(permissions, key)) {
    throw new Error(`Permission refusée: ${key}`);
  }
}

/**
 * Portée département/projet (cahier des charges §19 : droits définissables
 * « par rôle, département, projet ou équipe »). N'interroge la base que si
 * un scope est fourni — n'affecte pas hasPermission/requirePermission
 * ci-dessus, utilisées telles quelles par les 38 sites d'appel existants.
 * Une dérogation DENY l'emporte toujours ; une dérogation GRANT complète un
 * rôle qui n'accorde pas le droit nativement.
 */
export async function hasScopedPermission(
  permissions: string[] | undefined,
  key: PermissionKey,
  userId: string,
  scope?: { departmentId?: string; projectId?: string }
): Promise<boolean> {
  const roleGrants = hasPermission(permissions, key);
  if (!scope?.departmentId && !scope?.projectId) {
    return roleGrants;
  }

  // Import différé : évite d'alourdir le bundle client des consommateurs de
  // PERMISSIONS/hasPermission qui n'utilisent jamais ce chemin scopé.
  const { prisma } = await import("@/lib/prisma");
  const overrides = await prisma.permissionOverride.findMany({
    where: {
      userId,
      permissionKey: key,
      OR: [
        scope.departmentId ? { departmentId: scope.departmentId } : undefined,
        scope.projectId ? { projectId: scope.projectId } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
    },
  });

  if (overrides.some((o) => o.effect === "DENY")) return false;
  if (overrides.some((o) => o.effect === "GRANT")) return true;
  return roleGrants;
}

export async function requireScopedPermission(
  permissions: string[] | undefined,
  key: PermissionKey,
  userId: string,
  scope?: { departmentId?: string; projectId?: string }
): Promise<void> {
  const allowed = await hasScopedPermission(permissions, key, userId, scope);
  if (!allowed) {
    throw new Error(`Permission refusée: ${key}`);
  }
}
