import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { findEntitiesByTagNames } from "@/lib/tags";
import { fuzzyMatchIds, sortByRelevance } from "@/lib/fuzzy-search";
import { computeDepartmentDepth, departmentLevelLabel } from "@/lib/department-tree";
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
  | "KPI"
  | "Département"
  | "Équipe";

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
 * restent hors périmètre (pas de clé API LLM/embeddings — choix explicite
 * de différer, voir memoire) — mais chaque champ texte cherché tolère
 * désormais les fautes de frappe/variantes via pg_trgm (similarité
 * trigramme, src/lib/fuzzy-search.ts) : fuzzyMatchIds() élargit le rappel,
 * puis le findMany() Prisma qui suit applique les filtres avancés
 * existants sans les dupliquer en SQL brut, et sortByRelevance() réordonne
 * le résultat final selon la pertinence plutôt que l'ordre d'insertion.
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
    searches.push(
      fuzzyMatchIds("Project", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const where: Prisma.ProjectWhereInput = { id: { in: candidateIds } };
        if (filters.responsableId) where.responsableId = filters.responsableId;
        if (filters.departmentId) where.departmentId = filters.departmentId;
        if (filters.projectStatut) where.statut = filters.projectStatut as never;
        if (filters.projectPriorite) where.priorite = filters.projectPriorite as never;
        if (dateFrom || dateTo) {
          where.dateDebut = { gte: dateFrom, lte: dateTo };
        }
        const rows = await prisma.project.findMany({ where, take: 8, select: { id: true, nom: true, statut: true } });
        return sortByRelevance(rows, candidateIds).map((p) => ({
          type: "Projet" as const,
          id: p.id,
          title: p.nom,
          subtitle: p.statut,
          href: `/projets/${p.id}`,
          _entityType: "Project",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.TASK_READ)) {
    searches.push(
      fuzzyMatchIds("Task", ["titre"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const where: Prisma.TaskWhereInput = { id: { in: candidateIds } };
        if (filters.responsableId) where.responsablePrincipalId = filters.responsableId;
        if (filters.statut) where.statut = filters.statut as never;
        if (filters.priorite) where.priorite = filters.priorite as never;
        if (filters.departmentId) where.project = { departmentId: filters.departmentId };
        if (dateFrom || dateTo) {
          where.echeance = { gte: dateFrom, lte: dateTo };
        }
        const rows = await prisma.task.findMany({
          where,
          take: 8,
          select: { id: true, titre: true, statut: true, project: { select: { nom: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((t) => ({
          type: "Tâche" as const,
          id: t.id,
          title: t.titre,
          subtitle: `${t.project.nom} · ${t.statut}`,
          href: `/taches/${t.id}`,
          _entityType: "Task",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.TASK_COMMENT)) {
    searches.push(
      fuzzyMatchIds("TaskComment", ["content"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.taskComment.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, content: true, taskId: true, task: { select: { titre: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((c) => ({
          type: "Commentaire" as const,
          id: c.id,
          title: c.content.length > 80 ? `${c.content.slice(0, 80)}…` : c.content,
          subtitle: c.task.titre,
          href: `/taches/${c.taskId}`,
          _entityType: "TaskComment",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.MEETING_READ)) {
    searches.push(
      fuzzyMatchIds("Meeting", ["titre"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const where: Prisma.MeetingWhereInput = { id: { in: candidateIds } };
        if (dateFrom || dateTo) {
          where.dateHeure = { gte: dateFrom, lte: dateTo };
        }
        const rows = await prisma.meeting.findMany({ where, take: 8, select: { id: true, titre: true, dateHeure: true } });
        return sortByRelevance(rows, candidateIds).map((m) => ({
          type: "Réunion" as const,
          id: m.id,
          title: m.titre,
          subtitle: m.dateHeure.toLocaleDateString("fr-FR"),
          href: `/reunions/${m.id}`,
          _entityType: "Meeting",
        }));
      })
    );

    searches.push(
      fuzzyMatchIds("MeetingDecision", ["description"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.meetingDecision.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, description: true, meetingId: true, projectId: true },
        });
        return sortByRelevance(rows, candidateIds).map((d) => ({
          type: "Décision" as const,
          id: d.id,
          title: d.description.length > 80 ? `${d.description.slice(0, 80)}…` : d.description,
          subtitle: "Décision de réunion",
          href: d.meetingId ? `/reunions/${d.meetingId}` : d.projectId ? `/projets/${d.projectId}` : "/reunions",
          _entityType: "MeetingDecision",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.GOVERNANCE_READ)) {
    searches.push(
      fuzzyMatchIds("GovernanceDecision", ["objet"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.governanceDecision.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, objet: true, meetingId: true },
        });
        return sortByRelevance(rows, candidateIds).map((d) => ({
          type: "Décision" as const,
          id: d.id,
          title: d.objet,
          subtitle: "Décision de gouvernance",
          href: `/gouvernance/reunions/${d.meetingId}`,
          _entityType: "GovernanceDecision",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.DOCUMENT_READ)) {
    searches.push(
      fuzzyMatchIds("Document", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.document.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, project: { select: { nom: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((d) => ({
          type: "Document" as const,
          id: d.id,
          title: d.nom,
          subtitle: d.project.nom,
          href: `/documents/${d.id}`,
          _entityType: "Document",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.KNOWLEDGE_READ)) {
    searches.push(
      fuzzyMatchIds("KnowledgeArticle", ["titre", "content"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.knowledgeArticle.findMany({
          where: { id: { in: candidateIds }, statut: "PUBLIE" },
          take: 8,
          select: { id: true, titre: true, category: { select: { nom: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((a) => ({
          type: "Article" as const,
          id: a.id,
          title: a.titre,
          subtitle: a.category?.nom ?? null,
          href: `/base-de-connaissances/${a.id}`,
          _entityType: "KnowledgeArticle",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.COURRIER_READ)) {
    searches.push(
      fuzzyMatchIds("Courrier", ["objet", "reference"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.courrier.findMany({
          where: { id: { in: candidateIds }, confidentiel: false },
          take: 8,
          select: { id: true, objet: true, reference: true },
        });
        return sortByRelevance(rows, candidateIds).map((c) => ({
          type: "Courrier" as const,
          id: c.id,
          title: c.objet,
          subtitle: c.reference,
          href: `/courrier/${c.id}`,
          _entityType: "Courrier",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.CRM_READ)) {
    searches.push(
      fuzzyMatchIds("CrmContact", ["nom", "prenom", "email"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.crmContact.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, prenom: true, fonction: true, organization: { select: { nom: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((c) => ({
          type: "Contact CRM" as const,
          id: c.id,
          title: `${c.prenom} ${c.nom}`,
          subtitle: c.organization?.nom ?? c.fonction ?? null,
          href: `/crm/contacts/${c.id}`,
          _entityType: "CrmContact",
        }));
      })
    );

    searches.push(
      fuzzyMatchIds("CrmOrganization", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.crmOrganization.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, secteur: true, type: true },
        });
        return sortByRelevance(rows, candidateIds).map((o) => ({
          type: "Organisation CRM" as const,
          id: o.id,
          title: o.type === "PARTENAIRE" ? `${o.nom} (partenaire)` : o.nom,
          subtitle: o.secteur,
          href: `/crm/organisations/${o.id}`,
          _entityType: "CrmOrganization",
        }));
      })
    );

    searches.push(
      fuzzyMatchIds("Contract", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.contract.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, statut: true, opportunityId: true, organizationId: true },
        });
        return sortByRelevance(rows, candidateIds).map((c) => ({
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
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.PROCESS_READ)) {
    searches.push(
      fuzzyMatchIds("Processus", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.processus.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, statut: true },
        });
        return sortByRelevance(rows, candidateIds).map((p) => ({
          type: "Processus" as const,
          id: p.id,
          title: p.nom,
          subtitle: p.statut,
          href: `/processus/${p.id}`,
          _entityType: "Processus",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.RISK_READ)) {
    searches.push(
      fuzzyMatchIds("OrganizationalRisk", ["titre"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.organizationalRisk.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, titre: true, criticite: true },
        });
        return sortByRelevance(rows, candidateIds).map((r) => ({
          type: "Risque" as const,
          id: r.id,
          title: r.titre,
          subtitle: `Risque organisationnel · ${r.criticite}`,
          href: `/risques/${r.id}`,
          _entityType: "OrganizationalRisk",
        }));
      })
    );
  }

  if (hasPermission(permissions, PERMISSIONS.PROJECT_READ)) {
    searches.push(
      fuzzyMatchIds("ProjectRisk", ["titre"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.projectRisk.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, titre: true, statut: true, projectId: true, project: { select: { nom: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((r) => ({
          type: "Risque" as const,
          id: r.id,
          title: r.titre,
          subtitle: `Risque projet (${r.project.nom}) · ${r.statut}`,
          href: `/projets/${r.projectId}`,
          _entityType: "ProjectRisk",
        }));
      })
    );
  }

  // KPI (comble V3.0 §40, "Universal Organizational Search" — le seul type
  // de la liste du cahier absent jusqu'ici, "partenaires" étant déjà couvert
  // par Contact CRM/Organisation CRM ci-dessus).
  if (hasPermission(permissions, PERMISSIONS.OBJECTIVE_READ)) {
    searches.push(
      fuzzyMatchIds("Indicator", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.indicator.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, objectiveId: true, projectId: true, taskId: true, objective: { select: { titre: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((i) => ({
          type: "KPI" as const,
          id: i.id,
          title: i.nom,
          subtitle: i.objective?.titre ?? null,
          href: i.objectiveId ? `/objectifs/${i.objectiveId}` : i.projectId ? `/projets/${i.projectId}` : i.taskId ? `/taches/${i.taskId}` : "/objectifs",
          _entityType: "Indicator",
        }));
      })
    );
  }

  // Départements/Équipes (niveaux 2-5 du pilotage, §XXIII) — même garde que
  // /pilotage (DASHBOARD_READ), absent jusqu'ici de la recherche globale.
  if (hasPermission(permissions, PERMISSIONS.DASHBOARD_READ)) {
    searches.push(
      fuzzyMatchIds("Department", ["name"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const [rows, allDepartments] = await Promise.all([
          prisma.department.findMany({ where: { id: { in: candidateIds } }, take: 8, select: { id: true, name: true } }),
          prisma.department.findMany({ select: { id: true, name: true, parentId: true } }),
        ]);
        const byId = new Map(allDepartments.map((d) => [d.id, d]));
        return sortByRelevance(rows, candidateIds).map((d) => ({
          type: "Département" as const,
          id: d.id,
          title: d.name,
          subtitle: departmentLevelLabel(computeDepartmentDepth(d.id, byId)),
          href: `/pilotage/departement/${d.id}`,
          _entityType: "Department",
        }));
      })
    );

    searches.push(
      fuzzyMatchIds("Team", ["nom"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.team.findMany({
          where: { id: { in: candidateIds } },
          take: 8,
          select: { id: true, nom: true, department: { select: { name: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((t) => ({
          type: "Équipe" as const,
          id: t.id,
          title: t.nom,
          subtitle: t.department.name,
          href: `/pilotage/equipe/${t.id}`,
          _entityType: "Team",
        }));
      })
    );
  }

  // Les filtres avances (date/responsable/statut/priorite/departement) ne
  // s'appliquent a aucun champ Utilisateur : on saute cette recherche des
  // qu'un filtre est actif pour eviter de renvoyer des resultats non filtres.
  if (!hasAdvancedFilters) {
    searches.push(
      fuzzyMatchIds("User", ["name"], q).then(async (candidateIds) => {
        if (candidateIds.length === 0) return [];
        const rows = await prisma.user.findMany({
          where: { id: { in: candidateIds }, isActive: true },
          take: 8,
          select: { id: true, name: true, role: { select: { label: true } } },
        });
        return sortByRelevance(rows, candidateIds).map((u) => ({
          type: "Utilisateur" as const,
          id: u.id,
          title: u.name,
          subtitle: u.role.label,
          href: `/administration/utilisateurs`,
          _entityType: "User",
        }));
      })
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
