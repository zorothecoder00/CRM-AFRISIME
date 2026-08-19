import { prisma } from "@/lib/prisma";

// Organizational Designer (cahier des charges V3.0 §21) — concevoir
// virtuellement une organisation (ex. "Direction Afrique de l'Ouest -> Togo
// -> Bénin -> Côte d'Ivoire" puis équipes/responsables/compétences/projets/
// processus) et la simuler avant tout déploiement réel dans les vraies tables
// Department/Team/Project/Processus.

export type OrgTeamDraft = {
  nom: string;
  responsableId?: string;
  competences: string[];
  projets: string[];
  processus: string[];
};

export type OrgDesignNode = {
  nom: string;
  enfants: OrgDesignNode[];
  equipes: OrgTeamDraft[];
};

export type OrgDesignSimulation = {
  nouveauxDepartements: number;
  nouvellesEquipes: number;
  nouveauxProjets: number;
  nouveauxProcessus: number;
  competencesDistinctes: string[];
  competencesNouvelles: string[];
  responsablesManquants: number;
  profondeurMax: number;
};

function walk(
  node: OrgDesignNode,
  depth: number,
  acc: {
    deps: number;
    teams: number;
    projets: number;
    processus: number;
    competences: Set<string>;
    missingResp: number;
    maxDepth: number;
  }
) {
  acc.deps += 1;
  acc.maxDepth = Math.max(acc.maxDepth, depth);
  for (const equipe of node.equipes) {
    acc.teams += 1;
    if (!equipe.responsableId) acc.missingResp += 1;
    for (const c of equipe.competences) {
      const trimmed = c.trim();
      if (trimmed) acc.competences.add(trimmed);
    }
    acc.projets += equipe.projets.filter((p) => p.trim()).length;
    acc.processus += equipe.processus.filter((p) => p.trim()).length;
  }
  for (const enfant of node.enfants) walk(enfant, depth + 1, acc);
}

/** Simule un brouillon sans rien écrire — impact structurel + compétences déjà connues vs nouvelles. */
export async function simulateOrgDesign(structure: OrgDesignNode): Promise<OrgDesignSimulation> {
  const acc = {
    deps: 0,
    teams: 0,
    projets: 0,
    processus: 0,
    competences: new Set<string>(),
    missingResp: 0,
    maxDepth: 1,
  };
  walk(structure, 1, acc);

  const existing = await prisma.competence.findMany({ select: { nom: true } });
  const existingNames = new Set(existing.map((c) => c.nom.toLowerCase()));
  const competencesDistinctes = Array.from(acc.competences);
  const competencesNouvelles = competencesDistinctes.filter((c) => !existingNames.has(c.toLowerCase()));

  return {
    nouveauxDepartements: acc.deps,
    nouvellesEquipes: acc.teams,
    nouveauxProjets: acc.projets,
    nouveauxProcessus: acc.processus,
    competencesDistinctes,
    competencesNouvelles,
    responsablesManquants: acc.missingResp,
    profondeurMax: acc.maxDepth,
  };
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function deployNode(tx: TxClient, node: OrgDesignNode, parentId: string | null, createdById: string) {
  const code = `${node.nom
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .slice(0, 40)}-${Math.random().toString(36).slice(2, 7)}`;

  const department = await tx.department.create({
    data: { name: node.nom, code, parentId: parentId ?? undefined },
  });

  for (const equipe of node.equipes) {
    const responsable = equipe.responsableId
      ? await tx.user.findUnique({ where: { id: equipe.responsableId }, select: { id: true } })
      : null;

    await tx.team.create({
      data: {
        nom: equipe.nom,
        departmentId: department.id,
        leaderId: responsable?.id,
        createdById,
      },
    });

    for (const nom of equipe.competences) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      await tx.competence.upsert({
        where: { nom: trimmed },
        update: {},
        create: { nom: trimmed, createdById },
      });
    }

    for (const nom of equipe.projets) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      await tx.project.create({
        data: {
          nom: trimmed,
          departmentId: department.id,
          responsableId: responsable?.id ?? createdById,
          createdById,
          statut: "PLANIFIE",
        },
      });
    }

    for (const nom of equipe.processus) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      await tx.processus.create({
        data: { nom: trimmed, responsableId: responsable?.id, createdById, statut: "BROUILLON" },
      });
    }
  }

  for (const enfant of node.enfants) {
    await deployNode(tx, enfant, department.id, createdById);
  }

  return department.id;
}

/** Déploie un brouillon simulé : crée réellement Department/Team/Project/Processus. Retourne l'id du Department racine créé. */
export async function deployOrgDesign(structure: OrgDesignNode, createdById: string): Promise<string> {
  return prisma.$transaction(
    async (tx) => deployNode(tx, structure, null, createdById),
    { timeout: 30000 }
  );
}
