import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { findEntitiesByTagNames } from "@/lib/tags";
import type { Prisma } from "@/generated/prisma/client";

export type SearchResultType =
  | "Projet"
  | "Tâche"
  | "Réunion"
  | "Document"
  | "Article"
  | "Courrier"
  | "Commentaire"
  | "Utilisateur"
  | "Contact CRM"
  | "Organisation CRM"
  | "Contrat"
  | "Processus"
  | "Risque"
  | "Décision"
  | "KPI";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

// Etendu d'un `_entityType` interne (nom du modele Prisma, utilise par
// EntityTag) — jamais expose dans le SearchResult public, seulement pour le
// filtre par tag ci-dessous.
type Hit = SearchResult & { _entityType: string };

export type SearchFilters = {
  dateFrom?: string;
  dateTo?: string;
  responsableId?: string;
  statut?: string;
  priorite?: string;
  // Distincts de statut/priorite ci-dessus : enums propres a Project
  // (ProjectStatus/ProjectPriority), differents de ceux des Taches.
  projectStatut?: string;
  projectPriorite?: string;
  departmentId?: string;
  // Tags (cahier des charges V2.2 §28) — recherche par nom de tag,
  // s'applique a TOUS les types de resultats (via EntityTag, generique).
  tags?: string[];
};

/**
 * Recherche globale (cahier des charges §17, etendue V2.2 §28) : chaque
 * type d'entité n'est cherché que si l'utilisateur a la permission de
 * lecture correspondante. Les filtres avancés (date/responsable/statut/
 * priorité/département) s'appliquent aux Tâches ET aux Projets (les deux
 * types qui portent un statut et une priorité, avec des enums distincts —
 * ProjectStatus/ProjectPriority vs TaskStatus/TaskPriority) ; Réunions
 * n'applique que les filtres qui lui correspondent (pas de statut/priorité
 * sur une réunion). Contrat/Processus/Risque/Décision ajoutés pour combler
 * §28 (personnes/projets/tâches/documents/contrats/décisions/réunions/
 * partenaires/processus/risques déjà tous représentés par un modèle
 * existant — voir memoire project_afriflow_v2_2_extension). Indicator/KPI
 * ajouté (V3.0 §40, "Universal Organizational Search" — dernier type de la
 * liste du cahier absent jusque-là). "Recherche sémantique"/"recherche IA"
 * restent hors périmètre (pas de clé API LLM — choix explicite de différer,
 * voir memoire).
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
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.responsableId ||
    !!filters.statut ||
    !!filters.priorite ||
    !!filters.projectStatut ||
    !!filters.projectPriorite ||
    !!filters.departmentId;

  const searches: Promise<Hit[]>[] = [];

  if (hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
    const where: Prisma.ProjectWhereInput = { nom: { contains: q, mode: "insensitive" } };
    if (filters.responsableId) where.responsableId = filters.responsableId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.projectStatut) where.statut = filters.projectStatut as never;
    if (filters.projectPriorite) where.priorite = filters.projectPriorite as never;
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
            _entityType: "Project",
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
            _entityType: "Task",
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
            _entityType: "TaskComment",
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
            _entityType: "Meeting",
          }))
        )
    );

    searches.push(
      prisma.meetingDecision
        .findMany({
          where: { description: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, description: true, meetingId: true, projectId: true },
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "Décision" as const,
            id: d.id,
            title: d.description.length > 80 ? `${d.description.slice(0, 80)}…` : d.description,
            subtitle: "Décision de réunion",
            href: d.meetingId ? `/reunions/${d.meetingId}` : d.projectId ? `/projets/${d.projectId}` : "/reunions",
            _entityType: "MeetingDecision",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.GOVERNANCE_READ)) {
    searches.push(
      prisma.governanceDecision
        .findMany({
          where: { objet: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, objet: true, meetingId: true },
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "Décision" as const,
            id: d.id,
            title: d.objet,
            subtitle: "Décision de gouvernance",
            href: `/gouvernance/reunions/${d.meetingId}`,
            _entityType: "GovernanceDecision",
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
            _entityType: "Document",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.KNOWLEDGE_READ)) {
    searches.push(
      prisma.knowledgeArticle
        .findMany({
          where: {
            statut: "PUBLIE",
            OR: [{ titre: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }],
          },
          take: 8,
          select: { id: true, titre: true, category: { select: { nom: true } } },
        })
        .then((rows) =>
          rows.map((a) => ({
            type: "Article" as const,
            id: a.id,
            title: a.titre,
            subtitle: a.category?.nom ?? null,
            href: `/base-de-connaissances/${a.id}`,
            _entityType: "KnowledgeArticle",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.COURRIER_READ)) {
    searches.push(
      prisma.courrier
        .findMany({
          where: {
            confidentiel: false,
            OR: [
              { objet: { contains: q, mode: "insensitive" } },
              { reference: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          select: { id: true, objet: true, reference: true },
        })
        .then((rows) =>
          rows.map((c) => ({
            type: "Courrier" as const,
            id: c.id,
            title: c.objet,
            subtitle: c.reference,
            href: `/courrier/${c.id}`,
            _entityType: "Courrier",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.CRM_READ)) {
    searches.push(
      prisma.crmContact
        .findMany({
          where: {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { prenom: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          select: { id: true, nom: true, prenom: true, fonction: true, organization: { select: { nom: true } } },
        })
        .then((rows) =>
          rows.map((c) => ({
            type: "Contact CRM" as const,
            id: c.id,
            title: `${c.prenom} ${c.nom}`,
            subtitle: c.organization?.nom ?? c.fonction ?? null,
            href: `/crm/contacts/${c.id}`,
            _entityType: "CrmContact",
          }))
        )
    );

    searches.push(
      prisma.crmOrganization
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, secteur: true, type: true },
        })
        .then((rows) =>
          rows.map((o) => ({
            type: "Organisation CRM" as const,
            id: o.id,
            title: o.type === "PARTENAIRE" ? `${o.nom} (partenaire)` : o.nom,
            subtitle: o.secteur,
            href: `/crm/organisations/${o.id}`,
            _entityType: "CrmOrganization",
          }))
        )
    );

    searches.push(
      prisma.contract
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, statut: true, opportunityId: true, organizationId: true },
        })
        .then((rows) =>
          rows.map((c) => ({
            type: "Contrat" as const,
            id: c.id,
            title: c.nom,
            subtitle: c.statut,
            href: c.opportunityId
              ? `/crm/opportunites/${c.opportunityId}`
              : c.organizationId
                ? `/crm/organisations/${c.organizationId}`
                : "/crm",
            _entityType: "Contract",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.PROCESS_READ)) {
    searches.push(
      prisma.processus
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, statut: true },
        })
        .then((rows) =>
          rows.map((p) => ({
            type: "Processus" as const,
            id: p.id,
            title: p.nom,
            subtitle: p.statut,
            href: `/processus/${p.id}`,
            _entityType: "Processus",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.RISK_READ)) {
    searches.push(
      prisma.organizationalRisk
        .findMany({
          where: { titre: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, titre: true, criticite: true },
        })
        .then((rows) =>
          rows.map((r) => ({
            type: "Risque" as const,
            id: r.id,
            title: r.titre,
            subtitle: `Risque organisationnel · ${r.criticite}`,
            href: `/risques/${r.id}`,
            _entityType: "OrganizationalRisk",
          }))
        )
    );
  }

  if (hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
    searches.push(
      prisma.projectRisk
        .findMany({
          where: { titre: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, titre: true, statut: true, projectId: true, project: { select: { nom: true } } },
        })
        .then((rows) =>
          rows.map((r) => ({
            type: "Risque" as const,
            id: r.id,
            title: r.titre,
            subtitle: `Risque projet (${r.project.nom}) · ${r.statut}`,
            href: `/projets/${r.projectId}`,
            _entityType: "ProjectRisk",
          }))
        )
    );
  }

  // KPI (comble V3.0 §40, "Universal Organizational Search" — le seul type
  // de la liste du cahier absent jusqu'ici, "partenaires" étant déjà couvert
  // par Contact CRM/Organisation CRM ci-dessus).
  if (hasPermission(permissions, PERMISSIONS.OBJECTIVE_READ)) {
    searches.push(
      prisma.indicator
        .findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          take: 8,
          select: { id: true, nom: true, objectiveId: true, projectId: true, taskId: true, objective: { select: { titre: true } } },
        })
        .then((rows) =>
          rows.map((i) => ({
            type: "KPI" as const,
            id: i.id,
            title: i.nom,
            subtitle: i.objective?.titre ?? null,
            href: i.objectiveId ? `/objectifs/${i.objectiveId}` : i.projectId ? `/projets/${i.projectId}` : i.taskId ? `/taches/${i.taskId}` : "/objectifs",
            _entityType: "Indicator",
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
            _entityType: "User",
          }))
        )
    );
  }

  const results = (await Promise.all(searches)).flat();
  const toPublic = (r: Hit): SearchResult => ({ type: r.type, id: r.id, title: r.title, subtitle: r.subtitle, href: r.href });

  if (!filters.tags || filters.tags.length === 0) {
    return results.map(toPublic);
  }

  const tagged = await findEntitiesByTagNames(filters.tags);
  const taggedKeys = new Set(tagged.map((t) => `${t.entityType}:${t.entityId}`));
  return results.filter((r) => taggedKeys.has(`${r._entityType}:${r.id}`)).map(toPublic);
}
