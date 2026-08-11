import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";

export type SearchResultType = "Projet" | "Tâche" | "Réunion" | "Document" | "Commentaire" | "Utilisateur";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export type SearchFilters = {
  dateFrom?: string;
  dateTo?: string;
  responsableId?: string;
  statut?: string;
  priorite?: string;
  departmentId?: string;
};

/**
 * Recherche globale (cahier des charges §17) : chaque type d'entité n'est
 * cherché que si l'utilisateur a la permission de lecture correspondante.
 * Les filtres avancés (date/responsable/statut/priorité/département)
 * s'appliquent surtout aux Tâches (le seul type qui porte tous ces champs) ;
 * Projets/Réunions n'appliquent que les filtres qui leur correspondent.
 */
export async function globalSearch(
  query: string,
  permissions: string[],
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;
  const hasAdvancedFilters =
    !!filters.dateFrom || !!filters.dateTo || !!filters.responsableId || !!filters.statut || !!filters.priorite || !!filters.departmentId;

  const searches: Promise<SearchResult[]>[] = [];

  if (hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
    const where: Prisma.ProjectWhereInput = { nom: { contains: q, mode: "insensitive" } };
    if (filters.responsableId) where.responsableId = filters.responsableId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (dateFrom || dateTo) {
      where.dateDebut = { gte: dateFrom, lte: dateTo };
    }
    searches.push(
      prisma.project
        .findMany({ where, take: 8, select: { id: true, nom: true, statut: true } })
        .then((rows) =>
          rows.map((p) => ({
            type: "Projet" as const,
            id: p.id,
            title: p.nom,
            subtitle: p.statut,
            href: `/projets/${p.id}`,
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.TASK_READ)) {
    const where: Prisma.TaskWhereInput = { titre: { contains: q, mode: "insensitive" } };
    if (filters.responsableId) where.responsablePrincipalId = filters.responsableId;
    if (filters.statut) where.statut = filters.statut as never;
    if (filters.priorite) where.priorite = filters.priorite as never;
    if (filters.departmentId) where.project = { departmentId: filters.departmentId };
    if (dateFrom || dateTo) {
      where.echeance = { gte: dateFrom, lte: dateTo };
    }
    searches.push(
      prisma.task
        .findMany({
          where,
          take: 8,
          select: { id: true, titre: true, statut: true, project: { select: { nom: true } } },
        })
        .then((rows) =>
          rows.map((t) => ({
            type: "Tâche" as const,
            id: t.id,
            title: t.titre,
            subtitle: `${t.project.nom} · ${t.statut}`,
            href: `/taches/${t.id}`,
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.TASK_COMMENT)) {
    searches.push(
      prisma.taskComment
        .findMany({
          where: { content: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, content: true, taskId: true, task: { select: { titre: true } } },
        })
        .then((rows) =>
          rows.map((c) => ({
            type: "Commentaire" as const,
            id: c.id,
            title: c.content.length > 80 ? `${c.content.slice(0, 80)}…` : c.content,
            subtitle: c.task.titre,
            href: `/taches/${c.taskId}`,
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.MEETING_READ)) {
    const where: Prisma.MeetingWhereInput = { titre: { contains: q, mode: "insensitive" } };
    if (dateFrom || dateTo) {
      where.dateHeure = { gte: dateFrom, lte: dateTo };
    }
    searches.push(
      prisma.meeting
        .findMany({ where, take: 8, select: { id: true, titre: true, dateHeure: true } })
        .then((rows) =>
          rows.map((m) => ({
            type: "Réunion" as const,
            id: m.id,
            title: m.titre,
            subtitle: m.dateHeure.toLocaleDateString("fr-FR"),
            href: `/reunions/${m.id}`,
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.DOCUMENT_READ)) {
    searches.push(
      prisma.document
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, project: { select: { nom: true } } },
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "Document" as const,
            id: d.id,
            title: d.nom,
            subtitle: d.project.nom,
            href: `/documents/${d.id}`,
          }))
        )
    );
  }

  // Les filtres avances (date/responsable/statut/priorite/departement) ne
  // s'appliquent a aucun champ Utilisateur : on saute cette recherche des
  // qu'un filtre est actif pour eviter de renvoyer des resultats non filtres.
  if (!hasAdvancedFilters) {
    searches.push(
      prisma.user
        .findMany({
          where: { isActive: true, name: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, name: true, role: { select: { label: true } } },
        })
        .then((rows) =>
          rows.map((u) => ({
            type: "Utilisateur" as const,
            id: u.id,
            title: u.name,
            subtitle: u.role.label,
            href: `/administration/utilisateurs`,
          }))
        )
    );
  }

  const results = await Promise.all(searches);
  return results.flat();
}
