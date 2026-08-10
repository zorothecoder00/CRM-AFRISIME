import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export type SearchResultType = "Projet" | "Tâche" | "Réunion" | "Document" | "Utilisateur";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

/**
 * Recherche globale (cahier des charges §17) : chaque type d'entité n'est
 * cherché que si l'utilisateur a la permission de lecture correspondante,
 * cohérent avec le contrôle d'accès du reste de l'application (gating par
 * permission, pas de scoping par appartenance).
 */
export async function globalSearch(query: string, permissions: string[]): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const searches: Promise<SearchResult[]>[] = [];

  if (hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
    searches.push(
      prisma.project
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, statut: true },
        })
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
    searches.push(
      prisma.task
        .findMany({
          where: { titre: { contains: q, mode: "insensitive" } },
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

  if (hasPermission(permissions, PERMISSIONS.MEETING_READ)) {
    searches.push(
      prisma.meeting
        .findMany({
          where: { titre: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, titre: true, dateHeure: true },
        })
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

  const results = await Promise.all(searches);
  return results.flat();
}
