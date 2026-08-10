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
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.ADMINISTRATION_ACCESS,
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
  ],

  MANAGER: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_COMMENT,
  ],

  COLLABORATEUR: [
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_UPDATE,
    PERMISSIONS.TASK_COMMENT,
  ],

  CONSULTANT_EXTERNE: [PERMISSIONS.PROJECT_READ, PERMISSIONS.TASK_READ, PERMISSIONS.TASK_COMMENT],

  PRESTATAIRE: [PERMISSIONS.PROJECT_READ, PERMISSIONS.TASK_READ, PERMISSIONS.TASK_COMMENT],

  INVITE: [PERMISSIONS.PROJECT_READ, PERMISSIONS.TASK_READ],
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
