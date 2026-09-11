/**
 * Ordre de séniorité des rôles (demande utilisateur 2026-09-11 — "aucun
 * utilisateur ne peut ajouter un membre hiérarchiquement plus élevé que
 * lui" dans une équipe). Reprend l'ordre de déclaration de l'enum RoleKey
 * (schema.prisma), déjà une hiérarchie intentionnelle : voir
 * DEFAULT_ROLE_PERMISSIONS (permissions.ts), dont le nombre de permissions
 * par rôle décroît strictement dans ce même ordre.
 */
const SENIORITY_ORDER: readonly string[] = [
  "SUPER_ADMIN",
  "DIRECTEUR_GENERAL",
  "DIRECTEUR",
  "CHEF_DEPARTEMENT",
  "CHEF_PROJET",
  "RESPONSABLE",
  "MANAGER",
  "COLLABORATEUR",
  "CONSULTANT_EXTERNE",
  "PRESTATAIRE",
  "INVITE",
];

/** Rang de séniorité (0 = le plus élevé). Rôle inconnu -> rang le plus bas possible. */
export function roleRank(roleKey: string): number {
  const idx = SENIORITY_ORDER.indexOf(roleKey);
  return idx === -1 ? SENIORITY_ORDER.length : idx;
}

/** true si `roleKey` est strictement plus haut placé (plus senior) que `than`. */
export function isRoleSeniorTo(roleKey: string, than: string): boolean {
  return roleRank(roleKey) < roleRank(than);
}
