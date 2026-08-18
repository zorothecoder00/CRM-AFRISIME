import { prisma } from "@/lib/prisma";

export type MemoryResultSource =
  | "OrganizationalMemoryEntry"
  | "MeetingDecision"
  | "GovernanceDecision"
  | "Processus"
  | "Transformation"
  | "Project"
  | "KnowledgeArticle"
  | "Incident"
  | "AiAgentInsight";

export type MemoryResult = {
  source: MemoryResultSource;
  sourceId: string;
  titre: string;
  extrait: string;
  date: Date;
  href?: string;
};

const RESULT_LIMIT = 30;

function excerpt(text: string | null | undefined, max = 220): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// AI Memory Organisationnelle (cahier des charges V3.0 §17) — "l'IA doit
// progressivement comprendre le contexte historique de l'organisation" en
// exploitant decisions, projets, procedures, reunions (via leurs decisions),
// connaissances et resultats historiques deja enregistres dans l'app.
// Recherche deterministe par mots-cles (comme les autres agents IA sans cle
// LLM, cf. src/lib/ai-agents.ts) sur les sources deja existantes plutot
// qu'une base dupliquee : la vraie "memoire" (§18) est
// OrganizationalMemoryEntry + toutes ces entites, jamais recopiees.
export async function searchOrganizationalMemory(query?: string): Promise<MemoryResult[]> {
  const q = query?.trim();
  const textFilter = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const [memoryEntries, meetingDecisions, governanceDecisions, processus, transformations, projects, knowledgeArticles, incidents, insights] =
    await Promise.all([
      prisma.organizationalMemoryEntry.findMany({
        where: q ? { OR: [{ titre: textFilter }, { contenu: textFilter }] } : undefined,
        orderBy: { createdAt: "desc" },
        take: RESULT_LIMIT,
      }),
      prisma.meetingDecision.findMany({
        where: q ? { OR: [{ description: textFilter }, { motif: textFilter }] } : undefined,
        orderBy: { createdAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, description: true, motif: true, meetingId: true, projectId: true, createdAt: true },
      }),
      prisma.governanceDecision.findMany({
        where: q ? { OR: [{ objet: textFilter }, { contexte: textFilter }, { decision: textFilter }] } : undefined,
        orderBy: { createdAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, objet: true, decision: true, contexte: true, meetingId: true, createdAt: true },
      }),
      prisma.processus.findMany({
        where: q ? { OR: [{ nom: textFilter }, { description: textFilter }] } : undefined,
        orderBy: { updatedAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, nom: true, description: true, statut: true, updatedAt: true },
      }),
      prisma.transformation.findMany({
        where: q ? { OR: [{ nom: textFilter }, { description: textFilter }] } : undefined,
        orderBy: { updatedAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, nom: true, description: true, statut: true, updatedAt: true },
      }),
      prisma.project.findMany({
        where: {
          deletedAt: null,
          ...(q ? { OR: [{ nom: textFilter }, { description: textFilter }] } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, nom: true, description: true, statut: true, updatedAt: true },
      }),
      prisma.knowledgeArticle.findMany({
        where: {
          statut: "PUBLIE",
          ...(q ? { OR: [{ titre: textFilter }, { content: textFilter }] } : {}),
        },
        orderBy: { publishedAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, titre: true, content: true, publishedAt: true, createdAt: true },
      }),
      prisma.incident.findMany({
        where: q ? { OR: [{ titre: textFilter }, { description: textFilter }, { analyseCause: textFilter }] } : undefined,
        orderBy: { dateDeclaration: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, titre: true, description: true, analyseCause: true, dateDeclaration: true },
      }),
      prisma.aiAgentInsight.findMany({
        where: {
          type: "RECOMMANDATION",
          ...(q ? { OR: [{ titre: textFilter }, { contenu: textFilter }] } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: RESULT_LIMIT,
        select: { id: true, titre: true, contenu: true, createdAt: true },
      }),
    ]);

  const results: MemoryResult[] = [
    ...memoryEntries.map((e) => ({
      source: "OrganizationalMemoryEntry" as const,
      sourceId: e.id,
      titre: e.titre,
      extrait: excerpt(e.contenu),
      date: e.createdAt,
      href: e.entityType === "Processus" ? `/processus/${e.entityId}` : e.entityType === "Transformation" ? `/transformations/${e.entityId}` : undefined,
    })),
    ...meetingDecisions.map((d) => ({
      source: "MeetingDecision" as const,
      sourceId: d.id,
      titre: d.description,
      extrait: excerpt(d.motif),
      date: d.createdAt,
      href: d.meetingId ? `/reunions/${d.meetingId}` : d.projectId ? `/projets/${d.projectId}` : undefined,
    })),
    ...governanceDecisions.map((d) => ({
      source: "GovernanceDecision" as const,
      sourceId: d.id,
      titre: d.objet,
      extrait: excerpt(d.contexte || d.decision),
      date: d.createdAt,
      href: `/gouvernance/reunions/${d.meetingId}`,
    })),
    ...processus.map((p) => ({
      source: "Processus" as const,
      sourceId: p.id,
      titre: p.statut === "ARCHIVE" ? `${p.nom} (archivé)` : p.nom,
      extrait: excerpt(p.description),
      date: p.updatedAt,
      href: `/processus/${p.id}`,
    })),
    ...transformations.map((t) => ({
      source: "Transformation" as const,
      sourceId: t.id,
      titre: t.nom,
      extrait: excerpt(t.description),
      date: t.updatedAt,
      href: `/transformations/${t.id}`,
    })),
    ...projects.map((p) => ({
      source: "Project" as const,
      sourceId: p.id,
      titre: p.nom,
      extrait: excerpt(p.description),
      date: p.updatedAt,
      href: `/projets/${p.id}`,
    })),
    ...knowledgeArticles.map((a) => ({
      source: "KnowledgeArticle" as const,
      sourceId: a.id,
      titre: a.titre,
      extrait: excerpt(a.content),
      date: a.publishedAt ?? a.createdAt,
      href: `/base-de-connaissances/${a.id}`,
    })),
    ...incidents.map((i) => ({
      source: "Incident" as const,
      sourceId: i.id,
      titre: i.titre,
      extrait: excerpt(i.analyseCause || i.description),
      date: i.dateDeclaration,
    })),
    ...insights.map((i) => ({
      source: "AiAgentInsight" as const,
      sourceId: i.id,
      titre: i.titre,
      extrait: excerpt(i.contenu),
      date: i.createdAt,
      href: "/agents-ia",
    })),
  ];

  return results.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, RESULT_LIMIT);
}
